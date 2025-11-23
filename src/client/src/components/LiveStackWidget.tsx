/**
 * LiveStack Widget
 * Displays NINA LiveStack plugin images with target and filter selection
 * Features: Target selection, filter selection, image display, stack statistics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Flex,
  Text,
  Button,
  Select,
  Spinner,
  Callout,
  Badge,
  ScrollArea
} from '@radix-ui/themes';
import {
  ImageIcon,
  ReloadIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon
} from '@radix-ui/react-icons';
import ImageModal from './ImageModal';

interface LiveStackOption {
  Filter: string;
  Target: string;
}

interface LiveStackInfo {
  IsMonochrome: boolean;
  Filter: string;
  Target: string;
  // Monochrome properties
  StackCount?: number;
  // RGB properties
  RedStackCount?: number;
  GreenStackCount?: number;
  BlueStackCount?: number;
}

interface LiveStackResponse {
  Response: LiveStackInfo;
  Success: boolean;
  Error: string;
  StatusCode: number;
  Type: string;
}

interface LiveStackOptionsResponse {
  Response: LiveStackOption[];
  Success: boolean;
  Error: string;
  StatusCode: number;
  Type: string;
}

interface LiveStackImageResponse {
  Response: string; // Base64 image data
  Success: boolean;
  Error: string;
  StatusCode: number;
  Type: string;
}

interface LiveStackWidgetProps {
  onRefresh?: () => void;
  hideHeader?: boolean;
}

const LiveStackWidget: React.FC<LiveStackWidgetProps> = ({
  onRefresh,
  hideHeader = false
}) => {
  const [options, setOptions] = useState<LiveStackOption[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('');
  const [availableFilters, setAvailableFilters] = useState<string[]>([]);
  const [imageInfo, setImageInfo] = useState<LiveStackInfo | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Clean up blob URLs
  const cleanupImageUrl = useCallback((url: string) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }, []);

  // Fetch available options
  const fetchOptions = useCallback(async () => {
    try {
      console.log('📋 Fetching LiveStack available options...');

      const response = await fetch('/api/nina/livestack/options');
      const data: LiveStackOptionsResponse = await response.json();

      if (data.Success && Array.isArray(data.Response)) {
        setOptions(data.Response);
        console.log(`✅ Loaded ${data.Response.length} LiveStack options`);

        // Auto-select first RGB option or first available option
        const rgbOption = data.Response.find(opt => opt.Filter.toUpperCase() === 'RGB');
        const firstOption = data.Response[0];

        if (rgbOption) {
          setSelectedTarget(rgbOption.Target);
          setSelectedFilter(rgbOption.Filter);
          updateAvailableFilters(rgbOption.Target, data.Response);
        } else if (firstOption) {
          setSelectedTarget(firstOption.Target);
          setSelectedFilter(firstOption.Filter);
          updateAvailableFilters(firstOption.Target, data.Response);
        }
      } else {
        throw new Error(data.Error || 'Failed to fetch LiveStack options');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error fetching LiveStack options:', errorMsg);
      setError(errorMsg);
      setOptions([]);
    }
  }, []);

  // Update available filters based on selected target
  const updateAvailableFilters = useCallback((target: string, opts?: LiveStackOption[]) => {
    const currentOptions = opts || options;
    const filtersForTarget = currentOptions
      .filter(opt => opt.Target === target)
      .map(opt => opt.Filter);

    setAvailableFilters(filtersForTarget);

    // If current filter is not available for new target, select first available
    if (!filtersForTarget.includes(selectedFilter) && filtersForTarget.length > 0) {
      // Prefer RGB, then first available
      const rgbFilter = filtersForTarget.find(f => f.toUpperCase() === 'RGB');
      setSelectedFilter(rgbFilter || filtersForTarget[0]);
    }
  }, [options, selectedFilter]);

  // Fetch image info and data
  const fetchImage = useCallback(async () => {
    if (!selectedTarget || !selectedFilter) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`📸 Fetching LiveStack image: ${selectedTarget} - ${selectedFilter}`);

      // Fetch image info
      const infoResponse = await fetch(`/api/nina/livestack/info/${encodeURIComponent(selectedTarget)}/${encodeURIComponent(selectedFilter)}`);
      const infoData: LiveStackResponse = await infoResponse.json();

      if (!infoData.Success) {
        throw new Error(infoData.Error || 'Failed to fetch image info');
      }

      setImageInfo(infoData.Response);

      // Fetch image data using stream parameter for PNG
      const timestamp = Date.now();
      const imageUrl = `/api/nina/livestack/image/${encodeURIComponent(selectedTarget)}/${encodeURIComponent(selectedFilter)}?stream=true&t=${timestamp}`;

      console.log('🔗 Generating LiveStack image URL:', {
        target: selectedTarget,
        filter: selectedFilter,
        imageUrl: imageUrl,
        timestamp: timestamp
      });

      // Test the endpoint first to ensure it returns proper content type
      try {
        const testResponse = await fetch(imageUrl, { method: 'HEAD' });
        console.log('🧪 Stream endpoint test:', {
          status: testResponse.status,
          contentType: testResponse.headers.get('content-type'),
          contentLength: testResponse.headers.get('content-length')
        });
      } catch (testError) {
        console.warn('⚠️ Stream endpoint test failed:', testError instanceof Error ? testError.message : String(testError));
      }

      // Clean up previous image
      if (imageData) {
        cleanupImageUrl(imageData);
      }

      // Set the image URL directly (no need to convert base64 since we're streaming)
      setImageData(imageUrl);
      setLastRefresh(new Date().toLocaleTimeString());
      console.log('✅ LiveStack image URL set successfully');

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error fetching LiveStack image:', errorMsg);
      setError(errorMsg);
      setImageInfo(null);
      setImageData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedTarget, selectedFilter, cleanupImageUrl]);

  // Handle target change
  const handleTargetChange = (newTarget: string) => {
    setSelectedTarget(newTarget);
    updateAvailableFilters(newTarget);
  };

  // Handle filter change
  const handleFilterChange = (newFilter: string) => {
    setSelectedFilter(newFilter);
  };

  // Handle refresh
  const handleRefresh = async () => {
    await fetchImage();
    onRefresh?.();
  };

  // Get unique targets
  const availableTargets = [...new Set(options.map(opt => opt.Target))];

  // Format stack count display
  const formatStackCount = (info: LiveStackInfo) => {
    if (info.IsMonochrome) {
      return `${info.StackCount || 0} frames`;
    } else {
      return `R:${info.RedStackCount || 0} G:${info.GreenStackCount || 0} B:${info.BlueStackCount || 0}`;
    }
  };

  // Initial load
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  // Load image when target/filter changes
  useEffect(() => {
    if (selectedTarget && selectedFilter) {
      fetchImage();
    }
  }, [selectedTarget, selectedFilter, fetchImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (imageData) {
        cleanupImageUrl(imageData);
      }
    };
  }, [imageData, cleanupImageUrl]);

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        {/* Header */}
        {!hideHeader && (
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <ImageIcon />
              <Text size="3" weight="bold">LiveStack</Text>
              {lastRefresh && (
                <Badge color="gray" variant="soft" size="1">
                  {lastRefresh}
                </Badge>
              )}
            </Flex>

            <Button
              variant="soft"
              size="1"
              onClick={handleRefresh}
              disabled={loading || !selectedTarget || !selectedFilter}
            >
              {loading ? <Spinner size="1" /> : <ReloadIcon />}
              Refresh
            </Button>
          </Flex>
        )}

        {/* Controls */}
        <Flex 
          direction={{ initial: 'column', sm: 'row' }}
          align={{ initial: 'stretch', sm: 'center' }}
          gap="3"
        >
          <Flex align="center" gap="3" style={{ width: '100%' }}>
            <Text size="1" color="gray" style={{ minWidth: '45px' }}>Target:</Text>
            <Select.Root value={selectedTarget} onValueChange={handleTargetChange}>
              <Select.Trigger style={{ flex: 1, minWidth: '0' }} />
              <Select.Content>
                {availableTargets.map(target => (
                  <Select.Item key={target} value={target}>
                    {target}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex align="center" gap="3" style={{ width: '100%' }}>
            <Text size="1" color="gray" style={{ minWidth: '35px' }}>Filter:</Text>
            <Select.Root value={selectedFilter} onValueChange={handleFilterChange}>
              <Select.Trigger style={{ flex: 1, minWidth: '0' }} />
              <Select.Content>
                {availableFilters.map(filter => (
                  <Select.Item key={filter} value={filter}>
                    {filter}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>

        {/* Error state */}
        {error && (
          <Callout.Root color="red" size="1">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              <Text size="2" weight="medium">LiveStack Error</Text><br />
              <Text size="1" color="gray">{error}</Text>
            </Callout.Text>
          </Callout.Root>
        )}

        {/* Loading state */}
        {loading && !error && (
          <Flex justify="center" align="center" py="6">
            <Flex direction="column" align="center" gap="2">
              <Spinner size="2" />
              <Text size="1" color="gray">Loading LiveStack image...</Text>
            </Flex>
          </Flex>
        )}

        {/* Image display */}
        {!loading && !error && imageData && imageInfo && (
          <Flex direction="column" gap="3">
            {/* Image statistics */}
            <Flex justify="between" align="center" p="2" style={{
              backgroundColor: 'var(--gray-2)',
              borderRadius: '4px'
            }}>
              <Flex align="center" gap="2">
                <Badge color="blue" variant="soft">
                  <InfoCircledIcon />
                  {imageInfo.Filter}
                </Badge>
                <Text size="1" color="gray">
                  {formatStackCount(imageInfo)}
                </Text>
              </Flex>
              <Text size="1" color="gray">
                {imageInfo.IsMonochrome ? 'Monochrome' : 'RGB'}
              </Text>
            </Flex>

            {/* Image */}
            <Flex justify="center" align="center" style={{
              backgroundColor: 'var(--gray-1)',
              borderRadius: '6px',
              border: '1px solid var(--gray-4)'
            }}>
              <img
                src={imageData}
                alt={`LiveStack - ${imageInfo.Target} (${imageInfo.Filter})`}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-3)',
                  border: '1px solid var(--gray-6)',
                  background: 'var(--gray-1)',
                  cursor: 'pointer'
                }}
                onClick={() => setIsModalOpen(true)}
                onLoad={() => {
                  console.log('✅ LiveStack image displayed successfully');
                }}
                onError={(e) => {
                  console.error('❌ Error loading LiveStack image:', e);
                  console.error('Image src:', imageData);
                  setError('Failed to display image');
                }}
              />
            </Flex>
          </Flex>
        )}

        {/* Empty state */}
        {!loading && !error && !imageData && (
          <Flex justify="center" align="center" py="6">
            <Flex direction="column" align="center" gap="2">
              <ImageIcon style={{ width: '24px', height: '24px', opacity: 0.5 }} />
              <Text size="2" color="gray">No LiveStack image available</Text>
              <Text size="1" color="gray">Select a target and filter to view</Text>
            </Flex>
          </Flex>
        )}

        {/* Footer info */}
        {!hideHeader && (
          <Text size="1" color="gray">
            {imageInfo ?
              `${imageInfo.Target} • ${imageInfo.Filter} • ${formatStackCount(imageInfo)}` :
              'LiveStack preview from NINA plugin'
            }
          </Text>
        )}
      </Flex>

      {/* Full-screen image modal */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        imageSrc={imageData}
        imageAlt={imageInfo ? `LiveStack - ${imageInfo.Target} (${imageInfo.Filter})` : 'LiveStack image'}
      />
    </Card>
  );
};

export default LiveStackWidget;