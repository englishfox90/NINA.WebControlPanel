/**
 * Image Viewer Data Hook
 * Handles image fetching, session monitoring, and WebSocket updates
 * Eliminates duplicate API calls by relying on unified WebSocket session data
 */

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../config/api';
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

  // Add throttling to prevent duplicate API calls
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const FETCH_THROTTLE_MS = 2000; // 2 second minimum between fetches

  // Use unified WebSocket for session updates
  const { onSessionUpdate } = useUnifiedWebSocket();

  // Fetch latest image from prepared-image endpoint with throttling
  const fetchPreparedImage = useCallback(async () => {
    const now = Date.now();
    
    // Prevent concurrent requests
    if (imageLoading) {
      console.log('🚫 Fetch already in progress, skipping');
      return;
    }
    
    // Throttle API calls to prevent duplicates (but allow first call)
    if (lastFetchTime > 0 && now - lastFetchTime < FETCH_THROTTLE_MS) {
      console.log('🚫 Fetch throttled - too soon after last request');
      return;
    }

    try {
      setImageLoading(true);
      setError(null);
      setLastFetchTime(now);
      
      console.log('📸 Fetching latest prepared image...');
      const response = await fetch(getApiUrl('nina/prepared-image'), {
        method: 'GET',
        headers: {
          'Accept': 'image/*'
        }
      });

      console.log('📸 Image fetch response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('Content-Type'),
        contentLength: response.headers.get('Content-Length')
      });

      if (!response.ok) {
        // Get error details from response
        let errorDetails = `${response.status} ${response.statusText}`;
        try {
          const errorData = await response.text();
          console.log('📸 Error response body:', errorData);
          errorDetails += ` - ${errorData}`;
        } catch (e) {
          console.log('📸 Could not read error response body');
        }
        
        throw new Error(`Failed to fetch image: ${errorDetails}`);
      }

      // Convert blob to object URL
      const blob = await response.blob();
      console.log('📸 Image blob received:', { size: blob.size, type: blob.type });
      
      // Validate blob is actually an image
      if (blob.size === 0 || !blob.type.startsWith('image/')) {
        throw new Error(`Invalid image blob: size=${blob.size}, type=${blob.type}`);
      }
      
      // Clean up previous object URL to prevent memory leaks
      if (latestImage && latestImage.startsWith('blob:')) {
        URL.revokeObjectURL(latestImage);
      }
      
      const objectUrl = URL.createObjectURL(blob);
      setLatestImage(objectUrl);
      console.log('✅ Image loaded successfully:', objectUrl);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load image';
      console.error('❌ Image fetch error:', errorMessage);
      setError(errorMessage);
      setLatestImage(null);
    } finally {
      setImageLoading(false);
    }
  }, [latestImage, lastFetchTime, imageLoading]);

  // Handle IMAGE-SAVE events (from unified session or direct events)
  const handleImageSaveEvent = useCallback((event: any) => {
    console.log('📸 Processing IMAGE-SAVE event:', event);
    
    // Extract image statistics from the event
    const stats = event.enrichedData?.ImageStatistics || event.ImageStatistics || event.Data?.ImageStatistics;
    
    if (stats) {
      console.log('📸 Found ImageStatistics in event:', stats);
      setImageStats(stats);
      setError(null);
      
      // Fetch the prepared image after receiving IMAGE-SAVE event
      // Small delay to ensure NINA has processed the image
      setTimeout(() => {
        fetchPreparedImage();
      }, 1000);
    } else {
      console.log('📸 IMAGE-SAVE event missing ImageStatistics, only fetching image');
      // Still fetch the image even without stats
      setTimeout(() => {
        fetchPreparedImage();
      }, 1000);
    }
  }, [fetchPreparedImage]);

  // Handle unified session updates
  const handleSessionUpdate = useCallback((unifiedSession: any) => {
    console.log('📸 WebSocket session update received:', {
      isActive: unifiedSession.isActive,
      target: unifiedSession.target?.name,
      activity: unifiedSession.activity
    });
    
    setSessionData(unifiedSession);
    
    // Check if we're in an active imaging session
    const isActiveSession = unifiedSession.isActive && 
                           unifiedSession.activity?.subsystem === 'imaging' &&
                           unifiedSession.activity?.state !== 'idle';
    
    setIsImagingSession(isActiveSession);
    
    // Look for IMAGE-SAVED events in recent_events
    if (unifiedSession.events && Array.isArray(unifiedSession.events)) {
      const imageSaveEvents = unifiedSession.events.filter((event: any) => 
        event.eventType === 'IMAGE-SAVED' || event.eventType === 'IMAGE-SAVE'
      );
      
      if (imageSaveEvents.length > 0) {
        const latestImageEvent = imageSaveEvents[imageSaveEvents.length - 1];
        console.log('📸 Found IMAGE-SAVE event in session update:', latestImageEvent);
        handleImageSaveEvent(latestImageEvent);
      }
    }
  }, [handleImageSaveEvent]);

  // Subscribe to unified session updates only (eliminates duplicate API calls)
  useEffect(() => {
    console.log('📡 ImageViewer subscribing to WebSocket only - no initial API call');
    
    // Only subscribe to real-time session updates - WebSocket will provide initial data
    const unsubscribeSession = onSessionUpdate(handleSessionUpdate);
    
    return () => {
      console.log('📸 ImageViewer cleanup - unsubscribing from session updates');
      unsubscribeSession();
    };
  }, [onSessionUpdate, handleSessionUpdate]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (latestImage && latestImage.startsWith('blob:')) {
        URL.revokeObjectURL(latestImage);
      }
    };
  }, [latestImage]);

  // Manual refresh function for explicit user requests
  const refreshImage = useCallback(async () => {
    await fetchPreparedImage();
  }, [fetchPreparedImage]);

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
