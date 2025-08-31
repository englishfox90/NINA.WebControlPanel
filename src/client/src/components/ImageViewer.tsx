import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Box, 
  Flex, 
  Text, 
  Badge, 
  Spinner,
  Callout,
  Separator
} from '@radix-ui/themes';
import { 
  CameraIcon, 
  InfoCircledIcon
} from '@radix-ui/react-icons';
import { useImageViewerWebSocket } from '../hooks/useUnifiedWebSocket';
import { getApiUrl } from '../config/api';
import type { ImageViewerProps } from '../interfaces/dashboard';
import type { ImageStatistics } from '../interfaces/image';

export const ImageViewerWidget: React.FC<ImageViewerProps> = ({ onRefresh, hideHeader = false }) => {
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const [imageStats, setImageStats] = useState<ImageStatistics | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastImageSave, setLastImageSave] = useState<string>('');

  // Add throttling to prevent duplicate API calls
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const FETCH_THROTTLE_MS = 2000; // 2 second minimum between fetches

  // Use unified WebSocket for IMAGE-SAVE events
  const { onWidgetEvent } = useImageViewerWebSocket();

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
    
    setLastFetchTime(now);
    console.log('📸 Fetching prepared image...');
    setImageLoading(true);
    setError(null);
    
    try {
      // Use getApiUrl helper like other widgets for consistency
      const apiUrl = getApiUrl('nina/prepared-image?resize=true&size=800x600&autoPrepare=true');
      const response = await fetch(apiUrl);
      
      console.log('📸 Response details:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
        headers: {
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
          cacheControl: response.headers.get('cache-control')
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('📸 No prepared image available yet');
          setError('No image available from NINA');
          return;
        }
        
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

  // Handle WebSocket events - only IMAGE-SAVE, ignore IMAGE-PREPARED
  const handleImageSaveEvent = useCallback((event: any) => {
    console.log('📸 WebSocket event received:', event.Type, event);
    
    // Only process IMAGE-SAVE events (ignore IMAGE-PREPARED)
    if (event.Type !== 'IMAGE-SAVE') {
      console.log(`📸 Ignoring ${event.Type} event - only processing IMAGE-SAVE events`);
      return;
    }
    
    // Validate ImageStatistics are present
    if (!event.Data?.ImageStatistics) {
      console.log('📸 IMAGE-SAVE event missing ImageStatistics, ignoring');
      return;
    }

    const stats = event.Data.ImageStatistics;
    console.log('📊 Processing IMAGE-SAVE with statistics:', stats);
    
    // Store image statistics from WebSocket event
    setImageStats({
      ExposureTime: stats.ExposureTime || 0,
      ImageType: stats.ImageType || 'UNKNOWN',
      Filter: stats.Filter || 'N/A',
      Temperature: stats.Temperature || 0,
      CameraName: stats.CameraName || 'Unknown Camera',
      Date: event.Timestamp || new Date().toISOString(),
      Gain: stats.Gain || 0,
      Offset: stats.Offset || 0,
      HFR: stats.HFR || 0,
      Stars: stats.Stars || 0,
      Mean: stats.Mean || 0,
      StDev: stats.StDev || 0,
      TelescopeName: stats.TelescopeName || 'Unknown Telescope',
      RmsText: stats.RmsText || 'N/A'
    });
    
    setLastImageSave(event.Timestamp);
    
    // Fetch the prepared image after receiving IMAGE-SAVE event
    // Small delay to ensure NINA has processed the image
    setTimeout(() => {
      fetchPreparedImage();
    }, 1000);
  }, [fetchPreparedImage]);

  // Subscribe to IMAGE-SAVE WebSocket events
  useEffect(() => {
    console.log('🔌 Subscribing to IMAGE-SAVE events');
    const unsubscribe = onWidgetEvent(handleImageSaveEvent);
    
    return () => {
      console.log('🔌 Unsubscribing from IMAGE-SAVE events');
      unsubscribe();
    };
  }, [onWidgetEvent, handleImageSaveEvent]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (latestImage && latestImage.startsWith('blob:')) {
        URL.revokeObjectURL(latestImage);
      }
    };
  }, [latestImage]);

  // Utility functions
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatNumber = (num: number | undefined) => {
    return num?.toFixed(2) || 'N/A';
  };

  return (
    <Card>
      <Flex direction="column" gap="4" p="4">
        {/* Header */}
        {!hideHeader && (
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <CameraIcon />
              <Text size="3" weight="medium">Latest NINA Image</Text>
              {lastImageSave && (
                <Badge variant="soft" color="green" size="1">
                  Live Updates
                </Badge>
              )}
            </Flex>
          </Flex>
        )}

        {/* Error Display */}
        {error && (
          <Callout.Root color="orange">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        {/* Default State - No Image Available Yet */}
        {!latestImage && !imageLoading && !error && (
          <Flex direction="column" align="center" gap="3" py="8">
            <CameraIcon width="32" height="32" color="gray" />
            <Text size="3" color="gray" weight="medium">No image available yet</Text>
            <Text size="2" color="gray" style={{ textAlign: 'center', maxWidth: '300px' }}>
              Images will appear here automatically when NINA captures new photos
            </Text>
          </Flex>
        )}

        {/* Loading State */}
        {imageLoading && (
          <Flex direction="column" align="center" gap="3" py="8">
            <Spinner size="3" />
            <Text size="2" color="gray">Loading latest image...</Text>
          </Flex>
        )}

        {/* Image Display */}
        {latestImage && !imageLoading && (
          <Box>
            <Text size="2" weight="medium" mb="3">Latest Captured Image:</Text>
            <Card>
              <Box p="3">
                <Box style={{ textAlign: 'center' }}>
                  <img 
                    src={latestImage}
                    alt="Latest NINA capture"
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-3)',
                      backgroundColor: 'var(--color-surface)',
                      objectFit: 'contain'
                    }}
                    onLoad={() => console.log('🖼️ Image displayed successfully')}
                    onError={(e) => {
                      console.error('❌ Image display error:', e);
                      console.error('❌ Image src that failed:', latestImage);
                      setError('Failed to display image');
                    }}
                  />
                </Box>
              </Box>
            </Card>

            {/* Image Statistics */}
            {imageStats && (
              <Box mt="3">
                <Separator size="4" my="3" />
                <Text size="2" weight="medium" mb="2">Image Details:</Text>
                <Card variant="surface">
                  <Box p="3">
                    <Flex direction="column" gap="2">
                      <Flex justify="between" align="center">
                        <Text size="2" weight="medium">
                          {imageStats.Filter} - {imageStats.ExposureTime}s {imageStats.ImageType}
                        </Text>
                        <Badge color="blue">{imageStats.Filter}</Badge>
                      </Flex>
                      <Text size="1" color="gray">
                        {formatDate(imageStats.Date)}
                      </Text>
                      <Text size="1" color="gray">
                        {imageStats.CameraName} • {imageStats.TelescopeName}
                      </Text>
                      
                      <Flex justify="between" mt="2">
                        <Flex direction="column" gap="1">
                          {imageStats.HFR > 0 && (
                            <Text size="1" color="gray">
                              HFR: {formatNumber(imageStats.HFR)}
                            </Text>
                          )}
                          {imageStats.Stars > 0 && (
                            <Text size="1" color="gray">
                              Stars: {imageStats.Stars}
                            </Text>
                          )}
                          <Text size="1" color="gray">
                            Temperature: {imageStats.Temperature}°C
                          </Text>
                        </Flex>
                        <Flex direction="column" gap="1" align="end">
                          <Text size="1" color="gray">
                            Gain: {imageStats.Gain}
                          </Text>
                          <Text size="1" color="gray">
                            Offset: {imageStats.Offset}
                          </Text>
                          {imageStats.RmsText && imageStats.RmsText !== 'N/A' && (
                            <Text size="1" color="gray">
                              RMS: {imageStats.RmsText}
                            </Text>
                          )}
                        </Flex>
                      </Flex>
                    </Flex>
                  </Box>
                </Card>
              </Box>
            )}
          </Box>
        )}
      </Flex>
    </Card>
  );
};

export default ImageViewerWidget;
