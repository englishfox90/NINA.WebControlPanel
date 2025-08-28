import React, { useState, useEffect } from 'react';
import NINAStatus from './NINAStatus';
import RTSPViewer from './RTSPViewer';
import ImageViewer from './ImageViewer';
import MobileLayout from './MobileLayout';
import Settings from './Settings';
import { DashboardState } from '../types/dashboard';
import { Button, Badge, Flex, Box, Heading, Text, Card } from '@radix-ui/themes';
import { 
  ReloadIcon, 
  GearIcon, 
  VideoIcon, 
  ImageIcon, 
  ComponentInstanceIcon,
  DotFilledIcon
} from '@radix-ui/react-icons';

const Dashboard: React.FC = () => {
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    ninaStatus: 'Connected',
    gearProgress: 45,
    rtspFeeds: ['rtsp://192.168.1.100:554/stream1', 'rtsp://192.168.1.101:554/stream2'],
    latestImage: null,
    isOnline: true,
    lastUpdate: new Date().toLocaleTimeString(),
    connectionStatus: 'connected'
  });

  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Simulate data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDashboardState(prev => ({
        ...prev,
        lastUpdate: new Date().toLocaleTimeString(),
        gearProgress: Math.min(100, prev.gearProgress + Math.random() * 2)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setDashboardState(prev => ({
        ...prev,
        lastUpdate: new Date().toLocaleTimeString()
      }));
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="dashboard">
      {/* Dashboard Header */}
      <header className="dashboard-header">
        <nav className="dashboard-nav">
          <Flex align="center" justify="between" width="100%" px="4" py="3">
            <Flex align="center" gap="3">
              <ComponentInstanceIcon width="24" height="24" />
              <Heading as="h1" size="5" weight="bold">
                Observatory Control
              </Heading>
            </Flex>
            
            <Flex align="center" gap="4">
              <Flex align="center" gap="2">
                <DotFilledIcon 
                  width="12" 
                  height="12" 
                  style={{ color: dashboardState.isOnline ? '#10b981' : '#ef4444' }} 
                />
                <Badge 
                  color={dashboardState.isOnline ? 'green' : 'red'}
                  variant="soft"
                >
                  {dashboardState.connectionStatus.toUpperCase()}
                </Badge>
                <Text size="2" color="gray">
                  Last Update: {dashboardState.lastUpdate}
                </Text>
              </Flex>
              
              <Flex gap="2">
                <Button 
                  variant="soft"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <ReloadIcon width="16" height="16" />
                  Refresh
                </Button>
                <Button 
                  variant="soft"
                  onClick={() => setShowSettings(true)}
                >
                  <GearIcon width="16" height="16" />
                  Settings
                </Button>
              </Flex>
            </Flex>
          </Flex>
        </nav>
      </header>

      {/* Dashboard Main Content */}
      <main className="dashboard-main">
        <MobileLayout>
          <Box p="4">
            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
              {/* NINA Status Widget */}
              <Card size="3">
                <Flex direction="column" gap="3">
                  <Flex align="center" justify="between">
                    <Flex align="center" gap="2">
                      <ComponentInstanceIcon width="20" height="20" />
                      <Heading as="h3" size="4">
                        NINA Status
                      </Heading>
                    </Flex>
                    <Badge color="green" variant="soft">
                      <DotFilledIcon width="8" height="8" />
                      Connected
                    </Badge>
                  </Flex>
                  <NINAStatus 
                    status={dashboardState.ninaStatus}
                    progress={dashboardState.gearProgress}
                    isConnected={dashboardState.isOnline}
                  />
                </Flex>
              </Card>

              {/* RTSP Viewer Widget */}
              <Card size="3">
                <Flex direction="column" gap="3">
                  <Flex align="center" justify="between">
                    <Flex align="center" gap="2">
                      <VideoIcon width="20" height="20" />
                      <Heading as="h3" size="4">
                        Live Video Feeds
                      </Heading>
                    </Flex>
                    <Badge color="green" variant="soft">
                      <DotFilledIcon width="8" height="8" />
                      {dashboardState.rtspFeeds.length} Streams
                    </Badge>
                  </Flex>
                  <RTSPViewer 
                    streams={dashboardState.rtspFeeds}
                    isConnected={dashboardState.isOnline}
                  />
                </Flex>
              </Card>

              {/* Image Viewer Widget */}
              <Card size="3">
                <Flex direction="column" gap="3">
                  <Flex align="center" justify="between">
                    <Flex align="center" gap="2">
                      <ImageIcon width="20" height="20" />
                      <Heading as="h3" size="4">
                        Latest Captures
                      </Heading>
                    </Flex>
                    <Badge color="gray" variant="soft">
                      <DotFilledIcon width="8" height="8" />
                      Standby
                    </Badge>
                  </Flex>
                  <ImageViewer 
                    images={[]}
                    isLoading={loading}
                    onRefresh={handleRefresh}
                  />
                </Flex>
              </Card>

              {/* Equipment Status Widget */}
              <Card size="3">
                <Flex direction="column" gap="3">
                  <Flex align="center" justify="between">
                    <Flex align="center" gap="2">
                      <GearIcon width="20" height="20" />
                      <Heading as="h3" size="4">
                        Equipment Status
                      </Heading>
                    </Flex>
                    <Badge color="green" variant="soft">
                      <DotFilledIcon width="8" height="8" />
                      All Systems Go
                    </Badge>
                  </Flex>
                  <Flex direction="column" gap="3">
                    <Flex justify="between">
                      <Text size="2" color="gray">Mount</Text>
                      <Badge color="green" variant="soft">Connected</Badge>
                    </Flex>
                    <Flex justify="between">
                      <Text size="2" color="gray">Camera</Text>
                      <Badge color="green" variant="soft">Ready</Badge>
                    </Flex>
                    <Flex justify="between">
                      <Text size="2" color="gray">Filter Wheel</Text>
                      <Badge color="green" variant="soft">Position 2 (Red)</Badge>
                    </Flex>
                    <Flex justify="between">
                      <Text size="2" color="gray">Focuser</Text>
                      <Badge color="green" variant="soft">Position 12,543</Badge>
                    </Flex>
                    <Flex justify="between">
                      <Text size="2" color="gray">Temperature</Text>
                      <Text size="2" weight="medium">-10.2°C</Text>
                    </Flex>
                  </Flex>
                </Flex>
              </Card>
            </div>
          </Box>
        </MobileLayout>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <Settings 
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;