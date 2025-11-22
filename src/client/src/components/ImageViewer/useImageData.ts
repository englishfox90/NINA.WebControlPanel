/**
 * Image Viewer Data Hook with Exposure-Based Refresh
 * Implements exposure time + 10 second refresh cycle for continuous image updates
 * 1. On first load: Fetch latest image and metadata from NINA
 * 2. Schedule next refresh based on ExposureTime + 10 seconds
 * 3. Continue refreshing while component is mounted and active
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageStatistics } from '../../interfaces/image';

export interface UseImageDataReturn {
  latestImage: string | null;
  imageStats: ImageStatistics | null;
  imageLoading: boolean;
  error: string | null;
  isImagingSession: boolean;
  sessionData: any;
  refreshImage: () => Promise<void>;
  nextRefreshIn: number | null;
}

export const useImageData = (): UseImageDataReturn => {
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const [imageStats, setImageStats] = useState<ImageStatistics | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImagingSession, setIsImagingSession] = useState<boolean>(false);
  const [sessionData] = useState<any>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState<number | null>(null);

  // Refs for cleanup and timer management
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef<boolean>(true);

  // Clean up blob URLs
  const cleanupImageUrl = useCallback((url: string) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      // Cleaned up blob URL
    }
  }, []);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setNextRefreshIn(null);
  }, []);

  // Fetch image from new API endpoint
  const fetchLatestImage = useCallback(async (reason: 'initial' | 'scheduled' | 'manual' = 'manual') => {
    if (!isMounted.current) return;
    
    // Fetching latest image
    
    setImageLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/nina/latest-image');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      // Process API response with image and stats

      if (!isMounted.current) return;
      
      // Clean up previous image URL
      if (latestImage) {
        cleanupImageUrl(latestImage);
      }
      
      if (result.Success && result.imageBase64) {
        // Convert base64 to blob URL
        try {
          const binaryString = atob(result.imageBase64);
          const bytes = new Uint8Array(binaryString.length);
          
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const imageBlob = new Blob([bytes], { type: result.imageContentType || 'image/jpeg' });
          const imageUrl = URL.createObjectURL(imageBlob);
          
          setLatestImage(imageUrl);
          setImageStats(result.imageStats);
          setIsImagingSession(true);
          setError(null);
          
          // Image loaded successfully
          
          // Schedule next refresh based on last capture time + exposure time + 10s
          const exposureTime = result.ExposureTime || 30; // Default to 30s
          const imageDate = result.imageStats?.Date ? new Date(result.imageStats.Date) : new Date();
          const now = new Date();
          const timeSinceCapture = Math.floor((now.getTime() - imageDate.getTime()) / 1000); // seconds
          
          // Calculate time remaining: (exposure + 10) - time since capture
          const totalCycleTime = exposureTime + 10;
          const timeRemaining = Math.max(totalCycleTime - timeSinceCapture, 10); // Minimum 10 seconds
          const refreshDelay = Math.min(timeRemaining * 1000, 300000); // Cap at 5 minutes
          
          // Schedule next refresh based on smart timing calculation
          scheduleNextRefresh(refreshDelay);
          
        } catch (blobError) {
          console.error('❌ Error creating blob URL:', blobError);
          setError('Failed to process image data');
          setLatestImage(null);
          setImageStats(null);
          setIsImagingSession(false);
        }
      } else if (result.Success && result.StatusCode === 204) {
        // No images available
        setLatestImage(null);
        setImageStats(null);
        setIsImagingSession(false);
        setError(null);
        
        // No images available, retry scheduled
        scheduleNextRefresh(30000); // Retry in 30 seconds when no images
        
      } else {
        // Error response
        setLatestImage(null);
        setImageStats(null);
        setIsImagingSession(false);
        setError(result.Error || result.message || 'Failed to get image');
        
        // Error getting image, retry scheduled
        scheduleNextRefresh(30000); // Retry in 30 seconds on error
      }
      
    } catch (fetchError) {
      console.error('❌ Error fetching image:', fetchError);
      if (isMounted.current) {
        setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
        setLatestImage(null);
        setImageStats(null);
        setIsImagingSession(false);
        
        // Fetch error, retry scheduled
        scheduleNextRefresh(30000); // Retry in 30 seconds on network error
      }
    } finally {
      if (isMounted.current) {
        setImageLoading(false);
      }
    }
  }, [latestImage, cleanupImageUrl]);

  // Schedule next refresh with countdown
  const scheduleNextRefresh = useCallback((delayMs: number) => {
    if (!isMounted.current) return;
    
    clearTimers();
    
    const startTime = Date.now();
    const endTime = startTime + delayMs;
    
    // Set up countdown timer (update every second)
    countdownTimer.current = setInterval(() => {
      if (!isMounted.current) return;
      
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setNextRefreshIn(remaining);
      
      if (remaining === 0) {
        if (countdownTimer.current) {
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
        }
      }
    }, 1000);
    
    // Set up actual refresh timer
    refreshTimer.current = setTimeout(() => {
      if (isMounted.current) {
        // Scheduled refresh triggered
        fetchLatestImage('scheduled');
      }
    }, delayMs);
    
    // Set initial countdown
    setNextRefreshIn(Math.ceil(delayMs / 1000));
  }, [fetchLatestImage, clearTimers]);

  // Manual refresh function
  const refreshImage = useCallback(async () => {
    // Manual refresh requested
    clearTimers();
    await fetchLatestImage('manual');
  }, [fetchLatestImage, clearTimers]);

  // Initial fetch on mount
  useEffect(() => {
    // Setting up Image Viewer with exposure-based refresh
    isMounted.current = true;
    
    // Initial fetch
    fetchLatestImage('initial');
    
    return () => {
      // Cleaning up Image Viewer
      isMounted.current = false;
      clearTimers();
      
      // Cleanup blob URL on unmount
      if (latestImage) {
        cleanupImageUrl(latestImage);
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Cleanup effect for blob URLs when they change
  useEffect(() => {
    return () => {
      if (latestImage) {
        cleanupImageUrl(latestImage);
      }
    };
  }, [latestImage, cleanupImageUrl]);

  return {
    latestImage,
    imageStats,
    imageLoading,
    error,
    isImagingSession,
    sessionData,
    refreshImage,
    nextRefreshIn
  };
};