/**
 * Image Viewer Data Hook with Exposure-Based Refresh
 * Implements exposure time + 25 second refresh cycle for continuous image updates
 * ENHANCED: Listens to unified state WebSocket for IMAGE-SAVE events to trigger immediate refresh
 * 1. On first load: Fetch latest image and metadata from NINA
 * 2. Schedule next refresh based on ExposureTime + 25 seconds
 * 3. Listen for IMAGE-SAVE WebSocket events for instant updates
 * 4. Continue refreshing while component is mounted and active
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageStatistics } from '../../interfaces/image';
import { useUnifiedState } from '../../contexts/UnifiedStateContext';

export interface UseImageDataReturn {
  latestImage: string | null;
  imageStats: ImageStatistics | null;
  imageLoading: boolean;
  error: string | null;
  isImagingSession: boolean;
  sessionData: any;
  refreshImage: () => Promise<void>;
  nextRefreshIn: number | null;
  isExpired: boolean;
}

export const useImageData = (): UseImageDataReturn => {
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const [imageStats, setImageStats] = useState<ImageStatistics | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImagingSession, setIsImagingSession] = useState<boolean>(false);
  const [sessionData] = useState<any>(null);
  const [nextRefreshIn, setNextRefreshIn] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Listen to unified state for IMAGE-SAVE events
  const { state, lastUpdate } = useUnifiedState();

  // Refs for cleanup and timer management
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef<boolean>(true);
  const lastImageTime = useRef<string | null>(null);

  // Listen for IMAGE-SAVE events from unified state WebSocket
  useEffect(() => {
    if (lastUpdate?.updateKind === 'image' && 
        lastUpdate?.updateReason === 'image-saved' &&
        state?.currentSession?.imaging?.lastImage?.at) {
      
      const newImageTime = state.currentSession.imaging.lastImage.at;
      
      // Only refresh if this is a new image (different timestamp)
      if (newImageTime !== lastImageTime.current) {
        console.log('📸 IMAGE-SAVE event detected, refreshing image...');
        lastImageTime.current = newImageTime;
        
        // Clear existing timers and fetch immediately
        clearTimers();
        fetchLatestImage('manual');
      }
    }
  }, [lastUpdate, state?.currentSession?.imaging?.lastImage?.at]);

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
          
          // Check if image is expired (over 30 minutes old)
          const imageDate = result.imageStats?.Date ? new Date(result.imageStats.Date) : new Date();
          const now = new Date();
          const timeSinceCapture = Math.floor((now.getTime() - imageDate.getTime()) / 1000); // seconds
          const thirtyMinutesInSeconds = 30 * 60; // 1800 seconds
          
          if (timeSinceCapture > thirtyMinutesInSeconds) {
            // Image is over 30 minutes old - mark as expired
            setIsExpired(true);
            clearTimers();
            setNextRefreshIn(null); // Hide countdown for expired images
            console.log('📸 Image expired (>30min old), waiting for WebSocket updates');
          } else {
            // Image is recent - schedule next refresh
            setIsExpired(false);
            
            // Schedule next refresh based on last capture time + exposure time + 25s
            const exposureTime = result.ExposureTime || 30; // Default to 30s
            
            // Calculate time remaining: (exposure + 25) - time since capture
            const totalCycleTime = exposureTime + 25;
            const timeRemaining = Math.max(totalCycleTime - timeSinceCapture, 10); // Minimum 10 seconds
            const refreshDelay = Math.min(timeRemaining * 1000, 300000); // Cap at 5 minutes
            
            // Schedule next refresh based on smart timing calculation
            scheduleNextRefresh(refreshDelay);
          }
          
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
        setNextRefreshIn(null); // Hide countdown when no images
        console.log('📸 No images available, waiting for WebSocket IMAGE-SAVE events');
        
      } else {
        // Error response
        setLatestImage(null);
        setImageStats(null);
        setIsImagingSession(false);
        setError(result.Error || result.message || 'Failed to get image');
        setNextRefreshIn(null); // Hide countdown on error
        console.log('📸 Error getting image, waiting for WebSocket IMAGE-SAVE events');
      }
      
    } catch (fetchError) {
      console.error('❌ Error fetching image:', fetchError);
      if (isMounted.current) {
        setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
        setLatestImage(null);
        setImageStats(null);
        setIsImagingSession(false);
        setNextRefreshIn(null); // Hide countdown on network error
        console.log('📸 Network error, waiting for WebSocket IMAGE-SAVE events');
      }
    } finally {
      if (isMounted.current) {
        setImageLoading(false);
      }
    }
  }, [latestImage, cleanupImageUrl]);

  // Schedule countdown display (no auto-refresh - WebSocket handles updates)
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
      
      // Clear countdown when it reaches 0
      if (remaining === 0) {
        if (countdownTimer.current) {
          clearInterval(countdownTimer.current);
          countdownTimer.current = null;
        }
        setNextRefreshIn(null); // Hide countdown when at 0
      }
    }, 1000);
    
    // Set initial countdown
    setNextRefreshIn(Math.ceil(delayMs / 1000));
    
    // NO auto-refresh timer - WebSocket IMAGE-SAVE events handle this
    console.log(`⏱️ Countdown set for ${Math.ceil(delayMs / 1000)}s (WebSocket will trigger actual refresh)`);
  }, [clearTimers]);

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
    nextRefreshIn,
    isExpired
  };
};