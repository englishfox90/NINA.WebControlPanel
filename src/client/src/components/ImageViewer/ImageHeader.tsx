/**
 * Image Viewer Header Component
 * Displays widget title, session status, and refresh controls
 */

import React from 'react';
import { Flex, Text, Badge, Button, Spinner } from '@radix-ui/themes';
import { CameraIcon, ReloadIcon } from '@radix-ui/react-icons';

interface ImageHeaderProps {
  hideHeader?: boolean;
  isImagingSession: boolean;
  imageLoading: boolean;
  sessionData: any;
  onRefresh: () => void;
  nextRefreshIn?: number | null;
}

export const ImageHeader: React.FC<ImageHeaderProps> = ({
  hideHeader = false,
  isImagingSession,
  imageLoading,
  sessionData,
  onRefresh,
  nextRefreshIn
}) => {
  if (hideHeader) return null;

  return (
    <Flex justify="between" align="center" mb="3">
      <Flex align="center" gap="2">
        <CameraIcon />
        <Text size="3" weight="bold">Latest Image</Text>
        {isImagingSession && (
          <Badge color="green" variant="soft">
            Active Session
          </Badge>
        )}
        {sessionData?.target?.name && (
          <Badge color="blue" variant="soft">
            {sessionData.target.name}
          </Badge>
        )}
      </Flex>
      
      <Button 
        variant="soft" 
        size="1" 
        onClick={onRefresh}
        disabled={imageLoading}
      >
        {imageLoading ? <Spinner size="1" /> : <ReloadIcon />}
        Refresh
      </Button>
    </Flex>
  );
};
