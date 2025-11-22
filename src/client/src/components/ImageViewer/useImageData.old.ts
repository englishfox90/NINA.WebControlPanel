/**
 * REFACTORED Image Viewer Data Hook
 * Simplified architecture based on unified WebSocket and proper backend integration
 * Eliminates complex throttling and implements the requested behavior:
 * 1. On first load: Check if recent image available (< 30 min) and fetch if so
 * 2. On unifiedSession update: Fetch image when lastImage timestamp changes
 */

import { useState, useEffect, useCallback } from 'react';
import { useUnifiedWebSocket } from '../../hooks/useUnifiedWebSocket';
import type { ImageStatistics } from '../../interfaces/image';

export interface UseImageDataReturn {
  latestImage: string | null;
  imageStats: ImageStatistics | null;
  imageLoading: boolean;
  error: string | null;
  isImagingSession: boolean;
  sessionData: any;
  refreshImage: () => Promise<void>;
}

export const useImageData = (): UseImageDataReturn => {
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const [imageStats, setImageStats] = useState<ImageStatistics | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isImagingSession, setIsImagingSession] = useState<boolean>(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [isFirstLoad, setIsFirstLoad] = useState<boolean>(true);
  const [lastImageTimestamp, setLastImageTimestamp] = useState<string>('');

  // Use unified WebSocket for session updates only
  const { onSessionUpdate } = useUnifiedWebSocket();

  // Clean up blob URLs
  const cleanupImageUrl = useCallback((url: string) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      console.log('🧹 Cleaned up blob URL');
    }
  }, []);

  // Fetch image from API when needed
  const fetchImageIfNeeded = useCallback(async (reason: 'first-load' | 'websocket-update' | 'manual-refresh' = 'manual-refresh') => {
    console.log(`📸 Image fetch requested: ${reason}`);
    
    setImageLoading(true);
    setError(null);
    
    try {
      // Use force parameter only for manual refresh
      const forceParam = reason === 'manual-refresh' ? '?force=true' : '';
      const response = await fetch(`/api/nina/latest-image${forceParam}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('📸 API Response:', { 
        success: result.Success, 
        isRelevant: result.isRelevant,
        hasResponse: !!result.Response,
        message: result.message 
      });
      
      // Clean up previous image URL
      if (latestImage) {
        cleanupImageUrl(latestImage);
      }
      
      if (result.Success && result.isRelevant && result.Response) {
        // We have a recent image - create blob URL for display
        try {
          // The response should contain base64 image data
          const base64Data = result.Response;
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const imageBlob = new Blob([bytes], { type: 'image/jpeg' });
          const imageUrl = URL.createObjectURL(imageBlob);
          
          setLatestImage(imageUrl);
          setImageStats(result.metadata || null);
          setError(null);
          
          console.log('✅ Image loaded successfully');
        } catch (blobError) {
          console.error('❌ Error creating blob URL:', blobError);
          setError('Failed to process image data');
          setLatestImage(null);
          setImageStats(null);
        }
      } else {
        // No recent image available
        setLatestImage(null);
        setImageStats(null);
        setError(null);
        console.log('ℹ️ No recent image available:', result.message);
      }
      
    } catch (fetchError) {
      console.error('❌ Error fetching image:', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error');
      setLatestImage(null);
      setImageStats(null);
    } finally {
      setImageLoading(false);
    }
  }, [latestImage, cleanupImageUrl]);

  // Handle unified session updates
  const handleSessionUpdate = useCallback((unifiedSession: any) => {
    console.log('📡 Unified session update received');
    setSessionData(unifiedSession);
    
    // Update session activity status
    const newIsImagingSession = unifiedSession?.isActive || false;
    setIsImagingSession(newIsImagingSession);
    
    // Check if we should fetch a new image
    const newImageTimestamp = unifiedSession?.lastImage?.timestamp || '';
    const shouldFetch = newImageTimestamp && newImageTimestamp !== lastImageTimestamp;
    
    if (shouldFetch) {
      console.log('🔄 Image timestamp changed, fetching new image:', {
        old: lastImageTimestamp,
        new: newImageTimestamp
      });
      setLastImageTimestamp(newImageTimestamp);
      fetchImageIfNeeded('websocket-update');
    }
  }, [lastImageTimestamp, fetchImageIfNeeded]);

  // Subscribe to unified session updates and handle first load
  useEffect(() => {
    console.log('🔧 Setting up Image Viewer data hook');
    
    // Subscribe to session updates
    onSessionUpdate(handleSessionUpdate);
    
    // Handle first load
    if (isFirstLoad) {
      console.log('🚀 First load: Checking for recent images');
      setIsFirstLoad(false);
      fetchImageIfNeeded('first-load');
    }
    
    return () => {
      // Cleanup blob URL on unmount
      if (latestImage) {
        cleanupImageUrl(latestImage);
      }
    };
  }, [onSessionUpdate, handleSessionUpdate, fetchImageIfNeeded, isFirstLoad, latestImage, cleanupImageUrl]);

  // Manual refresh function
  const refreshImage = useCallback(async () => {
    console.log('🔄 Manual refresh requested');
    await fetchImageIfNeeded('manual-refresh');
  }, [fetchImageIfNeeded]);

  return {
    latestImage,
    imageStats,
    imageLoading,
    error,
    isImagingSession,
    sessionData,
    refreshImage
  };
};