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

  // Add throttling to prevent duplicate API calls, but allow IMAGE-SAVE triggered fetches
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const FETCH_THROTTLE_MS = 3000; // 3 second minimum between fetches (increased to reduce noise)

  // Use unified WebSocket for session updates and direct NINA events
  const { onSessionUpdate, onNINAEvent } = useUnifiedWebSocket();

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
      
      console.log('📸 Fetching latest prepared image from /nina/prepared-image...');
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
        // Handle 404 case specially (no image available yet)
        if (response.status === 404) {
          console.log('📸 No prepared image available yet (404)');
          setLatestImage(null);
          setError(null); // Don't show error for "no image yet" case
          return;
        }
        
        // Get error details from response for other errors
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

  // Removed handleImageSaveEvent - now using session-based approach only

  // Handle unified session updates
  const handleSessionUpdate = useCallback((unifiedSession: any) => {
    console.log('📸 [ImageViewer] Session update received:', {
      isActive: unifiedSession.isActive,
      target: unifiedSession.target?.name,
      hasLastImage: !!unifiedSession.lastImage,
      lastImageTimestamp: unifiedSession.lastImage?.timestamp
    });
    
    setSessionData(unifiedSession);
    
    // Determine if we're in an active imaging session
    const isActiveSession = unifiedSession.isActive && 
                           (unifiedSession.activity?.subsystem === 'imaging' ||
                            unifiedSession.activity?.subsystem === 'guiding' ||
                            !!unifiedSession.lastImage);
    
    setIsImagingSession(isActiveSession);
    
    // If in an active imaging session, always try to fetch the latest image
    if (isActiveSession) {
      console.log('📸 [ImageViewer] Active imaging session detected - fetching latest image');
      
      // If we have lastImage data in the session, update our stats
      if (unifiedSession.lastImage) {
        const newStats: ImageStatistics = {
          Filter: unifiedSession.lastImage.filter || 'Unknown',
          ExposureTime: unifiedSession.lastImage.exposureTime || 0,
          ImageType: unifiedSession.lastImage.type || 'LIGHT',
          Temperature: unifiedSession.lastImage.temperature || 0,
          HFR: unifiedSession.lastImage.hfr || 0,
          Stars: unifiedSession.lastImage.stars || 0,
          RmsText: unifiedSession.lastImage.rms || '',
          Date: unifiedSession.lastImage.timestamp || new Date().toISOString(),
          CameraName: unifiedSession.lastImage.camera || 'Unknown',
          TelescopeName: 'Unknown',
          FocalLength: 0,
          Gain: 0,
          Offset: 0,
          StDev: 0,
          Mean: 0,
          Median: 0,
          IsBayered: false
        };
        
        setImageStats(newStats);
        setError(null);
      }
      
      // Always fetch the latest image when in an active session
      // As per user requirement: "If in an active imaging session always pull the last image"
      fetchPreparedImage();
    }
  }, [fetchPreparedImage]);  // Subscribe to unified session updates and fetch initial image
  useEffect(() => {
    console.log('📡 ImageViewer initializing - subscribing to WebSocket');
    
    // Subscribe to real-time session updates
    const unsubscribeSession = onSessionUpdate(handleSessionUpdate);
    
    // Check for initial image after brief delay for session data to load
    const checkInitialImage = setTimeout(() => {
      console.log('📸 Checking for initial image load...');
      
      // Always try to fetch an image on initial load - let the backend determine if there's one available
      // This covers cases where we join mid-session or restart the frontend
      console.log('📸 Attempting initial image fetch');
      fetchPreparedImage();
      
    }, 1000); // Wait for session data to potentially arrive
    
    return () => {
      console.log('📸 ImageViewer cleanup - unsubscribing from session updates');
      clearTimeout(checkInitialImage);
      unsubscribeSession();
    };
  }, [onSessionUpdate, handleSessionUpdate, fetchPreparedImage]);

  // Removed direct NINA event listener - now relying on session updates only

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
