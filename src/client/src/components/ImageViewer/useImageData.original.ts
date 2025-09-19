/**
 * Image Viewer Data Hook
 * Handles image fetching, session monitoring, and WebSocket updates
 * Eliminates duplicate API calls by relying on unified WebSocket session data
 */

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../../config/api';
import { useUnifiedWebSocket } from '../../hooks/useUnifiedWebSocket';
import { unifiedWebSocket } from '../../services/unifiedWebSocket';
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
  const fetchPreparedImage = useCallback(async (skipThrottle = false) => {
    const now = Date.now();
    
    // Prevent concurrent requests
    if (imageLoading) {
      console.log('🚫 Fetch already in progress, skipping');
      return;
    }
    
    // Throttle API calls to prevent duplicates (but allow first call or when skipThrottle is true)
    if (!skipThrottle && lastFetchTime > 0 && now - lastFetchTime < FETCH_THROTTLE_MS) {
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
    console.log('� [ImageViewer] *** SESSION UPDATE HANDLER CALLED ***');
    console.log('�📸 [ImageViewer] Session update received:', {
      isActive: unifiedSession.isActive,
      target: unifiedSession.target?.name,
      hasLastImage: !!unifiedSession.lastImage,
      lastImageTimestamp: unifiedSession.lastImage?.timestamp,
      fullSessionData: unifiedSession
    });
    
    setSessionData(unifiedSession);
    
    // Determine if we're in an active imaging session
    const isActiveSession = unifiedSession.isActive && 
                           (unifiedSession.activity?.subsystem === 'imaging' ||
                            unifiedSession.activity?.subsystem === 'guiding' ||
                            !!unifiedSession.lastImage);
    
    console.log('📸 [ImageViewer] Active session check:', {
      isActive: unifiedSession.isActive,
      subsystem: unifiedSession.activity?.subsystem,
      hasLastImage: !!unifiedSession.lastImage,
      result: isActiveSession
    });
    
    setIsImagingSession(isActiveSession);
    
    // ALWAYS extract stats from persistent session data if available (for both initial load and updates)
    if (unifiedSession.lastImage) {
      console.log('� [ImageViewer] Extracting image stats from persistent unified session data');
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
      
      console.log('📊 [ImageViewer] Setting image stats from unified session:', newStats);
      setImageStats(newStats);
      setError(null);
    } else {
      console.log('📊 [ImageViewer] No lastImage data in unified session');
    }
    
    // If in an active imaging session, always try to fetch the latest image
    if (isActiveSession) {
      console.log('📸 [ImageViewer] Active imaging session detected - fetching latest image');
      
      // Always fetch the latest image when in an active session
      // As per user requirement: "If in an active imaging session always pull the last image"
      fetchPreparedImage(true); // Skip throttling for session-triggered updates
    }
  }, [fetchPreparedImage]);  // Subscribe to unified session updates and fetch initial image
  useEffect(() => {
    console.log('� [ImageViewer] *** WEBSOCKET SUBSCRIPTION EFFECT RUNNING ***');
    console.log('�📡 [ImageViewer] useEffect - Initializing WebSocket subscription');
    console.log('📡 [ImageViewer] onSessionUpdate function:', typeof onSessionUpdate);
    console.log('📡 [ImageViewer] handleSessionUpdate function:', typeof handleSessionUpdate);
    
    // Subscribe to real-time session updates
    const debugSessionHandler = (sessionData: any) => {
      console.log('🎯 [ImageViewer] DIRECT SESSION UPDATE RECEIVED!');
      console.log('📊 [ImageViewer] Raw session data:', sessionData);
      handleSessionUpdate(sessionData);
    };
    const unsubscribeSession = onSessionUpdate(debugSessionHandler);
    console.log('📡 [ImageViewer] Subscribed to session updates, unsubscribe function:', typeof unsubscribeSession);
    
    // TEMPORARY: Add NINA event listener to test if that works
    const testNINAHandler = (event: any) => {
      console.log('🔥 [ImageViewer] *** NINA EVENT RECEIVED ***', event?.Data?.eventType || event?.type);
      if (event?.Data?.eventType === 'IMAGE-SAVE' || event?.type === 'IMAGE-SAVE') {
        console.log('📸 [ImageViewer] IMAGE-SAVE event received via NINA listener, calling fetchPreparedImage with skipThrottle=true');
        fetchPreparedImage(true); // Skip throttling for real-time updates
      }
    };
    const unsubscribeNINA = onNINAEvent && onNINAEvent(testNINAHandler);
    console.log('🔥 [ImageViewer] NINA event subscription:', typeof unsubscribeNINA);
    
    // DIRECT WebSocket subscription as fallback
    console.log('🔌 [ImageViewer] Setting up direct WebSocket subscription for session updates');
    const directSessionHandler = (sessionData: any) => {
      console.log('🎯 [ImageViewer] DIRECT WebSocket session update received!');
      console.log('📊 [ImageViewer] Session data:', sessionData);
      if (sessionData && sessionData.lastImage) {
        console.log('📊 [ImageViewer] Extracting stats from direct WebSocket session data');
        const lastImage = sessionData.lastImage;
        const newStats: ImageStatistics = {
          Filter: lastImage.filter || 'Unknown',
          ExposureTime: lastImage.exposureTime || 0,
          ImageType: lastImage.type || 'LIGHT',
          Temperature: lastImage.temperature || 0,
          HFR: lastImage.hfr || 0,
          Stars: lastImage.stars || 0,
          RmsText: lastImage.rms || '',
          Date: lastImage.timestamp || new Date().toISOString(),
          CameraName: lastImage.camera || 'Unknown',
          TelescopeName: 'Unknown',
          FocalLength: 0,
          Gain: 0,
          Offset: 0,
          StDev: 0,
          Mean: 0,
          Median: 0,
          IsBayered: false
        };
        console.log('📊 [ImageViewer] Setting stats from direct WebSocket:', newStats);
        setImageStats(newStats);
        setError(null);
      }
    };
    
    // Subscribe directly to the WebSocket service
    unifiedWebSocket.on('session:update', directSessionHandler);
    console.log('🔌 [ImageViewer] Direct WebSocket subscription setup complete');
    
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
      if (unsubscribeNINA) unsubscribeNINA();
      // Clean up direct WebSocket subscription
      unifiedWebSocket.off('session:update', directSessionHandler);
    };
  }, [onSessionUpdate, handleSessionUpdate, fetchPreparedImage, onNINAEvent]);

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
    await fetchPreparedImage(true); // Manual refresh should skip throttling
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
