import React, { useState } from 'react';
import { ImageData } from '../types/dashboard';
import { Button, Flex, Box, Text, Grid, Dialog, Heading, Spinner } from '@radix-ui/themes';
import { 
  ReloadIcon, 
  ImageIcon, 
  ArchiveIcon, 
  Cross2Icon,
  CalendarIcon,
  CameraIcon,
  TargetIcon
} from '@radix-ui/react-icons';

interface ImageViewerProps {
  images: ImageData[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images, isLoading = false, onRefresh }) => {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);

  const mockImages: ImageData[] = [
    {
      id: '1',
      url: 'https://via.placeholder.com/800x600/1a1f2e/ffffff?text=M31+Andromeda',
      thumbnail: 'https://via.placeholder.com/200x150/1a1f2e/ffffff?text=M31',
      timestamp: '2025-08-26T22:45:00Z',
      metadata: {
        exposure: '300s',
        filter: 'Luminance',
        temperature: -10.2,
        target: 'M31 - Andromeda Galaxy'
      }
    },
    {
      id: '2',
      url: 'https://via.placeholder.com/800x600/2a2f3e/ffffff?text=M42+Orion',
      thumbnail: 'https://via.placeholder.com/200x150/2a2f3e/ffffff?text=M42',
      timestamp: '2025-08-26T21:30:00Z',
      metadata: {
        exposure: '180s',
        filter: 'Ha',
        temperature: -8.5,
        target: 'M42 - Orion Nebula'
      }
    }
  ];

  const displayImages = images.length > 0 ? images : mockImages;

  if (isLoading) {
    return (
      <Flex 
        align="center" 
        justify="center" 
        direction="column" 
        gap="3"
        style={{ minHeight: '200px' }}
      >
        <Spinner size="3" />
        <Text size="2" color="gray">Loading images...</Text>
      </Flex>
    );
  }

  if (displayImages.length === 0) {
    return (
      <Flex 
        align="center" 
        justify="center" 
        direction="column" 
        gap="3"
        style={{ minHeight: '200px', textAlign: 'center' }}
      >
        <ImageIcon width="32" height="32" color="var(--gray-9)" />
        <Text size="2" color="gray">No images captured yet</Text>
        <Text size="1" color="gray">Images will appear here after capture</Text>
        {onRefresh && (
          <Button size="2" onClick={onRefresh}>
            <ReloadIcon width="14" height="14" />
            Check for new images
          </Button>
        )}
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      {/* Image Grid */}
      <Grid columns="3" gap="2" width="100%">
        {displayImages.map((image) => (
          <Box 
            key={image.id}
            style={{
              cursor: 'pointer',
              borderRadius: 'var(--radius-2)',
              overflow: 'hidden',
              border: '1px solid var(--gray-6)',
              transition: 'all 150ms ease',
              aspectRatio: '4/3'
            }}
            onClick={() => setSelectedImage(image)}
            className="hover:border-red-8 hover:-translate-y-0.5"
          >
            <img 
              src={image.thumbnail || image.url} 
              alt={`Captured at ${new Date(image.timestamp).toLocaleString()}`}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                display: 'block' 
              }}
            />
          </Box>
        ))}
      </Grid>

      {/* Latest Image Details */}
      {displayImages.length > 0 && (
        <Box>
          <Heading as="h4" size="3" mb="3">Latest Capture</Heading>
          <Flex direction="column" gap="2">
            <Flex justify="between">
              <Flex align="center" gap="1">
                <TargetIcon width="14" height="14" />
                <Text size="2" color="gray">Target</Text>
              </Flex>
              <Text size="2" weight="medium">{displayImages[0].metadata?.target || 'Unknown'}</Text>
            </Flex>
            <Flex justify="between">
              <Flex align="center" gap="1">
                <CameraIcon width="14" height="14" />
                <Text size="2" color="gray">Exposure</Text>
              </Flex>
              <Text size="2" weight="medium">{displayImages[0].metadata?.exposure || 'N/A'}</Text>
            </Flex>
            <Flex justify="between">
              <Text size="2" color="gray">Filter</Text>
              <Text size="2" weight="medium">{displayImages[0].metadata?.filter || 'N/A'}</Text>
            </Flex>
            <Flex justify="between">
              <Text size="2" color="gray">Temperature</Text>
              <Text size="2" weight="medium">{displayImages[0].metadata?.temperature || 'N/A'}°C</Text>
            </Flex>
            <Flex justify="between">
              <Flex align="center" gap="1">
                <CalendarIcon width="14" height="14" />
                <Text size="2" color="gray">Captured</Text>
              </Flex>
              <Text size="2" weight="medium">
                {new Date(displayImages[0].timestamp).toLocaleString()}
              </Text>
            </Flex>
          </Flex>
        </Box>
      )}

      {/* Action Buttons */}
      <Flex gap="2" wrap="wrap">
        {onRefresh && (
          <Button variant="soft" size="2" onClick={onRefresh}>
            <ReloadIcon width="14" height="14" />
            Refresh
          </Button>
        )}
        <Button variant="soft" size="2">
          <ArchiveIcon width="14" height="14" />
          Browse All
        </Button>
      </Flex>

      {/* Modal for selected image */}
      <Dialog.Root open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <Dialog.Content maxWidth="90vw" maxHeight="90vh">
          <Dialog.Title>
            {selectedImage?.metadata?.target || 'Astrophoto'}
          </Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Captured: {selectedImage && new Date(selectedImage.timestamp).toLocaleString()}
          </Dialog.Description>
          
          <Box mb="4">
            <img 
              src={selectedImage?.url} 
              alt={`Full size: ${selectedImage?.metadata?.target || 'Astrophoto'}`}
              style={{ 
                width: '100%', 
                height: 'auto',
                borderRadius: 'var(--radius-2)' 
              }}
            />
          </Box>

          <Dialog.Close>
            <Button variant="soft" color="gray">
              <Cross2Icon width="14" height="14" />
              Close
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
};

export default ImageViewer;