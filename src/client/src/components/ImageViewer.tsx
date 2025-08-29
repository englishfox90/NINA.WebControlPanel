import React, { useState, useEffect, useRef } from 'react';
import { ImageData } from '../types/dashboard';
import { NINAEvent, NINATargetEvent, NINAFilterEvent, NINASafetyEvent } from '../types/nina';
import { fetchNINAEventHistory, createNINAWebSocket } from '../services/ninaApi';
import { 
  Button, 
  Flex, 
  Box, 
  Text, 
  Grid, 
  Dialog, 
  Heading, 
  Spinner,
  Badge,
  Card,
  Separator,
  Progress,
  Strong
} from '@radix-ui/themes';
import { 
  ReloadIcon, 
  ImageIcon, 
  ArchiveIcon, 
  Cross2Icon,
  CalendarIcon,
  CameraIcon,
  TargetIcon,
  ActivityLogIcon,
  TimerIcon,
  MixerHorizontalIcon,
  UpdateIcon,
  PlayIcon,
  StopIcon,
  PauseIcon,
  ExclamationTriangleIcon
} from '@radix-ui/react-icons';

// Session State interface
interface SessionState {
  isActive: boolean;
  currentTarget: string | null;
  currentProject: string | null;
  currentFilter: string | null;
  targetEndTime: string | null;
  rotation: number | null;
  coordinates: any | null;
  isSafe: boolean;
  lastImageTime: string | null;
  sequenceStatus: 'idle' | 'running' | 'paused' | 'finished' | 'waiting';
  events: NINAEvent[];
}

interface ImageViewerProps {
  images: ImageData[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images, isLoading = false, onRefresh }) => {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive: false,
    currentTarget: null,
    currentProject: null,
    currentFilter: null,
    targetEndTime: null,
    rotation: null,
    coordinates: null,
    isSafe: true,
    lastImageTime: null,
    sequenceStatus: 'idle',
    events: []
  });
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  // WebSocket connection and event handling
  useEffect(() => {
    // Initialize with event history
    const loadEventHistory = async () => {
      try {
        const events = await fetchNINAEventHistory();
        if (events.length > 0) {
          // Events might be in reverse order, so reverse them if needed
          const sortedEvents = events.sort((a, b) => 
            new Date(a.Time).getTime() - new Date(b.Time).getTime()
          );
          updateSessionFromEvents(sortedEvents);
        }
      } catch (error) {
        console.warn('Failed to load event history:', error);
      }
    };

    // Setup WebSocket connection
    const connectWebSocket = () => {
      try {
        const ws = createNINAWebSocket(handleNINAEvent);
        
        if (ws) {
          ws.onopen = () => {
            console.log('NINA WebSocket connected');
            setWsConnected(true);
          };
          
          ws.onclose = () => {
            console.log('NINA WebSocket disconnected');
            setWsConnected(false);
            // Attempt to reconnect after 5 seconds
            setTimeout(connectWebSocket, 5000);
          };
          
          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setWsConnected(false);
          };
          
          wsRef.current = ws;
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setTimeout(connectWebSocket, 5000);
      }
    };

    loadEventHistory();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const updateSessionFromEvents = (events: NINAEvent[]) => {
    let newState: SessionState = {
      isActive: false,
      currentTarget: null,
      currentProject: null,
      currentFilter: null,
      targetEndTime: null,
      rotation: null,
      coordinates: null,
      isSafe: true,
      lastImageTime: null,
      sequenceStatus: 'idle',
      events: events.slice(-10) // Keep last 10 events
    };

    // Process events to build current state
    for (const event of events) {
      switch (event.Event) {
        case 'SEQUENCE-STARTING':
          newState.sequenceStatus = 'running';
          newState.isActive = true;
          break;
        case 'SEQUENCE-FINISHED':
          newState.sequenceStatus = 'finished';
          newState.isActive = false;
          break;
        case 'TS-WAITSTART':
          newState.sequenceStatus = 'waiting';
          break;
        case 'TS-TARGETSTART':
        case 'TS-NEWTARGETSTART':
          const targetEvent = event as NINATargetEvent;
          newState.currentTarget = targetEvent.TargetName;
          newState.currentProject = targetEvent.ProjectName;
          newState.targetEndTime = targetEvent.TargetEndTime;
          newState.rotation = targetEvent.Rotation;
          newState.coordinates = targetEvent.Coordinates;
          newState.isActive = true;
          newState.sequenceStatus = 'running';
          break;
        case 'FILTERWHEEL-CHANGED':
          const filterEvent = event as NINAFilterEvent;
          newState.currentFilter = filterEvent.New.Name;
          break;
        case 'SAFETY-CHANGED':
          const safetyEvent = event as NINASafetyEvent;
          newState.isSafe = safetyEvent.IsSafe;
          break;
        case 'IMAGE-SAVE':
          newState.lastImageTime = event.Time;
          break;
      }
    }

    setSessionState(newState);
  };

  const handleNINAEvent = (event: NINAEvent) => {
    setSessionState(prevState => {
      const newEvents = [...prevState.events, event].slice(-10); // Keep last 10 events
      const newState = { ...prevState, events: newEvents };

      // Update state based on event type
      switch (event.Event) {
        case 'SEQUENCE-STARTING':
          newState.sequenceStatus = 'running';
          newState.isActive = true;
          break;
        case 'SEQUENCE-FINISHED':
          newState.sequenceStatus = 'finished';
          newState.isActive = false;
          break;
        case 'TS-WAITSTART':
          newState.sequenceStatus = 'waiting';
          break;
        case 'TS-TARGETSTART':
        case 'TS-NEWTARGETSTART':
          const targetEvent = event as NINATargetEvent;
          newState.currentTarget = targetEvent.TargetName;
          newState.currentProject = targetEvent.ProjectName;
          newState.targetEndTime = targetEvent.TargetEndTime;
          newState.rotation = targetEvent.Rotation;
          newState.coordinates = targetEvent.Coordinates;
          newState.isActive = true;
          newState.sequenceStatus = 'running';
          break;
        case 'FILTERWHEEL-CHANGED':
          const filterEvent = event as NINAFilterEvent;
          newState.currentFilter = filterEvent.New.Name;
          break;
        case 'SAFETY-CHANGED':
          const safetyEvent = event as NINASafetyEvent;
          newState.isSafe = safetyEvent.IsSafe;
          break;
        case 'IMAGE-SAVE':
          newState.lastImageTime = event.Time;
          break;
      }

      return newState;
    });
  };

  const getStatusColor = () => {
    if (!sessionState.isSafe) return 'red';
    switch (sessionState.sequenceStatus) {
      case 'running': return 'green';
      case 'waiting': return 'yellow';
      case 'paused': return 'orange';
      case 'finished': return 'blue';
      default: return 'gray';
    }
  };

  const getStatusIcon = () => {
    if (!sessionState.isSafe) return <ExclamationTriangleIcon />;
    switch (sessionState.sequenceStatus) {
      case 'running': return <PlayIcon />;
      case 'waiting': return <PauseIcon />;
      case 'finished': return <StopIcon />;
      default: return <ActivityLogIcon />;
    }
  };

  const getStatusText = () => {
    if (!sessionState.isSafe) return 'UNSAFE - Observatory Safety Triggered';
    switch (sessionState.sequenceStatus) {
      case 'running': return 'Active Imaging Session';
      case 'waiting': return 'Waiting for Target Start Time';
      case 'finished': return 'Session Complete';
      case 'paused': return 'Session Paused';
      default: return 'No Active Session';
    }
  };

  const formatTimeRemaining = (endTime: string | null): string => {
    if (!endTime) return 'Unknown';
    const end = new Date(endTime);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Complete';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  const mockImages: ImageData[] = [
    {
      id: '1',
      url: 'https://via.placeholder.com/800x600/1a1f2e/ffffff?text=Live+Preview',
      thumbnail: 'https://via.placeholder.com/200x150/1a1f2e/ffffff?text=Preview',
      timestamp: sessionState.lastImageTime || new Date().toISOString(),
      metadata: {
        exposure: '300s',
        filter: sessionState.currentFilter || 'L',
        temperature: -10.2,
        target: sessionState.currentTarget || 'Live Session'
      }
    }
  ];

  const displayImages = images.length > 0 ? images : (sessionState.isActive ? mockImages : []);

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
        <Text size="2" color="gray">Connecting to NINA...</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      {/* Real-time Session Status */}
      <Card>
        <Flex direction="column" gap="3">
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              {getStatusIcon()}
              <Strong>{getStatusText()}</Strong>
            </Flex>
            <Flex align="center" gap="2">
              <Badge 
                color={wsConnected ? 'green' : 'red'} 
                variant={wsConnected ? 'solid' : 'soft'}
              >
                {wsConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              <Badge color={getStatusColor()} variant="soft">
                {sessionState.sequenceStatus.toUpperCase()}
              </Badge>
            </Flex>
          </Flex>

          {sessionState.currentTarget && (
            <>
              <Separator />
              <Flex direction="column" gap="2">
                <Heading as="h4" size="3">Current Target</Heading>
                <Grid columns="2" gap="3">
                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="1">
                      <TargetIcon width="14" height="14" />
                      <Text size="2" color="gray">Target</Text>
                    </Flex>
                    <Strong>{sessionState.currentTarget}</Strong>
                  </Flex>
                  
                  <Flex direction="column" gap="1">
                    <Text size="2" color="gray">Project</Text>
                    <Strong>{sessionState.currentProject || 'N/A'}</Strong>
                  </Flex>

                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="1">
                      <MixerHorizontalIcon width="14" height="14" />
                      <Text size="2" color="gray">Filter</Text>
                    </Flex>
                    <Strong>{sessionState.currentFilter || 'N/A'}</Strong>
                  </Flex>

                  <Flex direction="column" gap="1">
                    <Flex align="center" gap="1">
                      <TimerIcon width="14" height="14" />
                      <Text size="2" color="gray">Time Remaining</Text>
                    </Flex>
                    <Strong>{formatTimeRemaining(sessionState.targetEndTime)}</Strong>
                  </Flex>

                  {sessionState.coordinates && (
                    <>
                      <Flex direction="column" gap="1">
                        <Text size="2" color="gray">RA</Text>
                        <Strong>{sessionState.coordinates.RAString}</Strong>
                      </Flex>

                      <Flex direction="column" gap="1">
                        <Text size="2" color="gray">Dec</Text>
                        <Strong>{sessionState.coordinates.DecString}</Strong>
                      </Flex>
                    </>
                  )}
                </Grid>
              </Flex>
            </>
          )}
        </Flex>
      </Card>

      {/* Latest Image/Live Preview */}
      {displayImages.length > 0 && (
        <Card>
          <Flex direction="column" gap="3">
            <Heading as="h4" size="3">
              {sessionState.isActive ? 'Live Preview' : 'Latest Capture'}
            </Heading>
            
            <Box 
              style={{
                borderRadius: 'var(--radius-2)',
                overflow: 'hidden',
                border: '1px solid var(--gray-6)',
                aspectRatio: '4/3',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedImage(displayImages[0])}
            >
              <img 
                src={displayImages[0].thumbnail || displayImages[0].url} 
                alt={`${displayImages[0].metadata?.target || 'Preview'}`}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  display: 'block' 
                }}
              />
            </Box>

            <Grid columns="2" gap="3">
              <Flex justify="between">
                <Text size="2" color="gray">Exposure</Text>
                <Strong>{displayImages[0].metadata?.exposure || 'N/A'}</Strong>
              </Flex>
              <Flex justify="between">
                <Text size="2" color="gray">Filter</Text>
                <Strong>{displayImages[0].metadata?.filter || 'N/A'}</Strong>
              </Flex>
              <Flex justify="between">
                <Text size="2" color="gray">Temperature</Text>
                <Strong>{displayImages[0].metadata?.temperature || 'N/A'}°C</Strong>
              </Flex>
              <Flex justify="between">
                <Text size="2" color="gray">Captured</Text>
                <Strong>
                  {sessionState.lastImageTime 
                    ? new Date(sessionState.lastImageTime).toLocaleTimeString()
                    : 'N/A'
                  }
                </Strong>
              </Flex>
            </Grid>
          </Flex>
        </Card>
      )}

      {/* Recent Events */}
      {sessionState.events.length > 0 && (
        <Card>
          <Flex direction="column" gap="3">
            <Heading as="h4" size="3">Recent Activity</Heading>
            <Flex direction="column" gap="2">
              {sessionState.events.slice(-5).reverse().map((event, index) => (
                <Flex key={index} justify="between" align="center">
                  <Flex align="center" gap="2">
                    <ActivityLogIcon width="12" height="12" color="var(--gray-9)" />
                    <Text size="2">{event.Event.replace(/-/g, ' ')}</Text>
                  </Flex>
                  <Text size="1" color="gray">
                    {new Date(event.Time).toLocaleTimeString()}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Flex>
        </Card>
      )}

      {/* No Session State */}
      {!sessionState.isActive && displayImages.length === 0 && (
        <Flex 
          align="center" 
          justify="center" 
          direction="column" 
          gap="3"
          style={{ minHeight: '200px', textAlign: 'center' }}
        >
          <ImageIcon width="32" height="32" color="var(--gray-9)" />
          <Text size="2" color="gray">No active imaging session</Text>
          <Text size="1" color="gray">Start a sequence in NINA to see live updates</Text>
        </Flex>
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
          Browse All Images
        </Button>
        {sessionState.isActive && (
          <Button variant="soft" size="2" color="blue">
            <UpdateIcon width="14" height="14" />
            Session Details
          </Button>
        )}
      </Flex>

      {/* Modal for selected image */}
      <Dialog.Root open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <Dialog.Content maxWidth="90vw" maxHeight="90vh">
          <Dialog.Title>
            {selectedImage?.metadata?.target || 'Astrophoto'}
          </Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Captured: {selectedImage && new Date(selectedImage.timestamp).toLocaleString()}
            {sessionState.isActive && " (Live Session)"}
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