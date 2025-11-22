/**
 * Image Statistics Component
 * Displays technical information about the captured image
 */

import React from 'react';
import { Box, Flex, Text, Badge, Separator } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import type { ImageStatistics } from '../../interfaces/image';

interface ImageStatsProps {
  imageStats: ImageStatistics | null;
  hasImage: boolean; // Add prop to know if we have an image
  nextRefreshIn?: number | null; // Countdown to next exposure
}

export const ImageStats: React.FC<ImageStatsProps> = ({ imageStats, hasImage, nextRefreshIn }) => {
  // Filter color coding
  const getFilterColor = (filter: string): 'blue' | 'red' | 'green' | 'yellow' => {
    const filterLower = filter.toLowerCase();
    if (filterLower.includes('blue') || filterLower.includes('oiii')) return 'blue';
    if (filterLower.includes('red') || filterLower.includes('ha')) return 'red';
    if (filterLower.includes('green') || filterLower.includes('sii')) return 'green';
    return 'yellow';
  };

  // If we don't have stats but we do have an image, show basic info
  if (!imageStats && hasImage) {
    return (
      <Box mt="3">
        <Separator size="4" mb="3" />
        
        <Flex align="center" gap="2" mb="3">
          <InfoCircledIcon />
          <Text size="2" weight="medium">Image Information</Text>
        </Flex>

        <Flex direction="column" gap="2">
          <Flex justify="between" align="center">
            <Text size="1" color="gray">Status</Text>
            <Badge variant="soft" color="blue">
              Image Available
            </Badge>
          </Flex>
          
          <Flex justify="between" align="center">
            <Text size="1" color="gray">Statistics</Text>
            <Badge variant="soft" color="gray">
              Loading...
            </Badge>
          </Flex>
          
          <Text size="1" color="gray" style={{ textAlign: 'center', marginTop: '8px' }}>
            Detailed statistics will appear after the next image capture
          </Text>
        </Flex>
      </Box>
    );
  }

  // If we have no image and no stats, don't show anything
  if (!imageStats) return null;

  // Format numbers for display
  const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return value.toFixed(decimals);
  };

  const formatInteger = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return Math.round(value).toString();
  };

  return (
    <Box mt="3">
      <Separator size="4" mb="3" />
      
      <Flex align="center" gap="2" mb="3">
        <InfoCircledIcon />
        <Text size="2" weight="medium">Image Statistics</Text>
      </Flex>

      <Flex direction="column" gap="2">
        {/* Image Quality Metrics */}
        <Flex justify="between" align="center">
          <Text size="1" color="gray">Stars Detected</Text>
          <Badge variant="soft" color="blue">
            {formatInteger(imageStats.Stars)}
          </Badge>
        </Flex>

        {/* NINA-specific fields */}
        {imageStats.ExposureTime && (
          <Flex justify="between" align="center">
            <Text size="1" color="gray">Exposure Time</Text>
            <Badge variant="soft" color="green">
              {imageStats.ExposureTime}s
            </Badge>
          </Flex>
        )}

        {imageStats.Filter && (
          <Flex justify="between" align="center">
            <Text size="1" color="gray">Filter</Text>
            <Badge variant="soft" color={getFilterColor(imageStats.Filter)}>
              {imageStats.Filter}
            </Badge>
          </Flex>
        )}

        {imageStats.TargetName && (
          <Flex justify="between" align="center">
            <Text size="1" color="gray">Target</Text>
            <Badge variant="soft" color="purple">
              {imageStats.TargetName}
            </Badge>
          </Flex>
        )}

        {imageStats.Date && (
          <Flex justify="between" align="center">
            <Text size="1" color="gray">Captured</Text>
            <Badge variant="soft" color="gray">
              {new Date(imageStats.Date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </Badge>
          </Flex>
        )}

        {imageStats.Temperature !== null && imageStats.Temperature !== undefined && (
          <Flex justify="between" align="center">
            <Text size="1" color="gray">Temperature</Text>
            <Badge variant="soft" color={imageStats.Temperature < 0 ? 'blue' : 'orange'}>
              {formatNumber(imageStats.Temperature, 1)}°C
            </Badge>
          </Flex>
        )}

        {imageStats.Gain && (
          <Flex justify="between" align="center">
            <Text size="1" color="gray">Gain</Text>
            <Badge variant="soft" color="gray">
              {imageStats.Gain}
            </Badge>
          </Flex>
        )}


      </Flex>
    </Box>
  );
};
