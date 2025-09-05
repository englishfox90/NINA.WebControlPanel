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
}

export const ImageStats: React.FC<ImageStatsProps> = ({ imageStats }) => {
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
            {formatInteger(imageStats.detectedStars)}
          </Badge>
        </Flex>

        <Flex justify="between" align="center">
          <Text size="1" color="gray">HFR (Half Flux Radius)</Text>
          <Badge variant="soft" color={imageStats.hfr && imageStats.hfr < 3 ? 'green' : 'orange'}>
            {formatNumber(imageStats.hfr)} px
          </Badge>
        </Flex>

        {/* Noise and Quality */}
        {imageStats.noise !== null && imageStats.noise !== undefined && (
          <Flex justify="between" align="center">
            <Text size="1" color="gray">Noise</Text>
            <Badge variant="soft" color="gray">
              {formatNumber(imageStats.noise)}
            </Badge>
          </Flex>
        )}

        {/* Image Statistics */}
        <Flex justify="between" align="center">
          <Text size="1" color="gray">Mean ADU</Text>
          <Badge variant="soft" color="gray">
            {formatNumber(imageStats.mean)}
          </Badge>
        </Flex>

        <Flex justify="between" align="center">
          <Text size="1" color="gray">Median ADU</Text>
          <Badge variant="soft" color="gray">
            {formatNumber(imageStats.median)}
          </Badge>
        </Flex>

        <Flex justify="between" align="center">
          <Text size="1" color="gray">Std Deviation</Text>
          <Badge variant="soft" color="gray">
            {formatNumber(imageStats.stdDev)}
          </Badge>
        </Flex>

        {/* Min/Max Values */}
        <Flex justify="between" align="center">
          <Text size="1" color="gray">Min / Max ADU</Text>
          <Badge variant="soft" color="gray">
            {formatInteger(imageStats.min)} / {formatInteger(imageStats.max)}
          </Badge>
        </Flex>

        {/* Mad (Median Absolute Deviation) if available */}
        {imageStats.mad !== null && imageStats.mad !== undefined && (
          <Flex justify="between" align="center">
            <Text size="1" color="gray">MAD</Text>
            <Badge variant="soft" color="gray">
              {formatNumber(imageStats.mad)}
            </Badge>
          </Flex>
        )}
      </Flex>
    </Box>
  );
};
