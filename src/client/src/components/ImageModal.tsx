/**
 * Image Modal Component
 * Displays images in a full-screen modal for better viewing, especially on mobile
 */

import React from 'react';
import { Dialog, Flex, IconButton, Box } from '@radix-ui/themes';
import { Cross2Icon } from '@radix-ui/react-icons';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  imageAlt?: string;
}

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageSrc,
  imageAlt = 'Full size image'
}) => {
  if (!imageSrc) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Content
        style={{
          maxWidth: '95vw',
          maxHeight: '95vh',
          width: 'auto',
          padding: '0',
          overflow: 'hidden'
        }}
      >
        {/* Close button */}
        <Box
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 1000
          }}
        >
          <IconButton
            variant="soft"
            color="gray"
            size="2"
            onClick={onClose}
            style={{
              cursor: 'pointer',
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)'
            }}
          >
            <Cross2Icon width="18" height="18" />
          </IconButton>
        </Box>

        {/* Image container */}
        <Flex
          justify="center"
          align="center"
          style={{
            width: '100%',
            height: '100%',
            minHeight: '200px',
            background: 'var(--gray-1)',
            cursor: 'zoom-out'
          }}
          onClick={onClose}
        >
          <img
            src={imageSrc}
            alt={imageAlt}
            style={{
              maxWidth: '100%',
              maxHeight: '95vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
            onClick={(e) => {
              // Prevent close when clicking image itself
              e.stopPropagation();
            }}
          />
        </Flex>

        {/* Instructions overlay
        <Box
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            padding: '8px 16px',
            borderRadius: 'var(--radius-2)',
            pointerEvents: 'none'
          }}
        >
           <Flex gap="3" align="center">
            <span style={{ fontSize: '12px', color: 'white', opacity: 0.9 }}>
              Click anywhere to close • ESC to exit
            </span>
          </Flex> 
        </Box> */}
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default ImageModal;
