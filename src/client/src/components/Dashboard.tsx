import React, { useState, useCallback, useEffect } from 'react';
import { Flex, Box, Button, Badge, Heading, Text } from '@radix-ui/themes';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import NINAStatus from './NINAStatus';
import SystemStatusWidget from './SystemStatusWidget';
import SchedulerWidget from './SchedulerWidget';
import RTSPViewer from './RTSPViewer';
import SessionWidgetEnhanced from './SessionWidget/Enhanced';
import TimeAstronomicalWidget from './TimeAstronomicalWidget';
import ImageViewerWidget from './ImageViewer';
import WeatherWidget from './WeatherWidget';
import GuiderGraphWidget from './GuiderGraphWidget';
import NINALogsWidget from './NINALogsWidget';
import LiveStackWidget from './LiveStackWidget';
import SafetyBanner from './SafetyBanner';
import { SettingsModal } from './SettingsModal';
import WidgetService, { WidgetConfig } from '../services/widgetService';
import { useResponsive } from '../hooks/useResponsive';
import { getApiUrl } from '../config/api';
import { 
  ReloadIcon, 
  DotFilledIcon,
  CornerBottomRightIcon,
  DragHandleDots2Icon,
  Pencil1Icon,
  CheckIcon,
  GearIcon
} from '@radix-ui/react-icons';
import type { NinaConnectionStatus } from '../interfaces/equipment';

// Import react-grid-layout CSS
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Grid layout configuration
const gridLayoutProps = {
  className: "layout",
  cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
  rowHeight: 30,
  width: 1200
};

const responsiveProps = {
  breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
};

// Convert widget config to grid layout format
const getGridLayout = (widgets: WidgetConfig[]): Layout[] => {
  return widgets.map(widget => ({
    i: widget.id,
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: widget.layout.minW,
    minH: widget.layout.minH
  }));
};

const Dashboard: React.FC = () => {
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [rtspFeeds, setRtspFeeds] = useState<string[]>([]);
  const [ninaConnectionStatus, setNinaConnectionStatus] = useState<NinaConnectionStatus>({
    connected: false,
    message: 'Checking connection...'
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Get responsive state
  const { isMobile } = useResponsive();

  // Load widgets from database
  const loadWidgets = async () => {
    try {
      setLayoutLoading(true);
      const savedWidgets = await WidgetService.loadWidgets();
      if (savedWidgets && savedWidgets.length > 0) {
        setWidgetConfig(savedWidgets);
      } else {
        console.warn('No widgets found in database');
        setWidgetConfig([]);
      }
    } catch (error) {
      console.error('Failed to load widgets, using empty array:', error);
      setWidgetConfig([]);
    } finally {
      setLayoutLoading(false);
    }
  };

  // Fetch config from backend API
  const fetchConfig = async () => {
    try {
      const response = await fetch(getApiUrl('config'));
      const config = await response.json();
      const feeds = [
        config.streams?.liveFeed1 || '',
        config.streams?.liveFeed2 || '',
        config.streams?.liveFeed3 || ''
      ].filter(Boolean); // Remove empty strings
      setRtspFeeds(feeds);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  // Fetch NINA connection status
  const fetchNinaConnectionStatus = async () => {
    try {
      const response = await fetch(getApiUrl('nina/status'));
      const status = await response.json();
      setNinaConnectionStatus(status);
    } catch (error) {
      console.error('Failed to fetch NINA connection status:', error);
      setNinaConnectionStatus({
        connected: false,
        message: 'Failed to check connection'
      });
    }
  };

  useEffect(() => {
    loadWidgets();
    fetchConfig();
    fetchNinaConnectionStatus();

    // Set up periodic connection status checking every 30 seconds
    const statusInterval = setInterval(fetchNinaConnectionStatus, 30000);

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  // Handle layout changes and save to database
  const handleLayoutChange = useCallback((layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    if (layoutLoading || !isEditMode) return; // Only save in edit mode
    
    // Update the widget config with new layout positions
    const updatedConfig = widgetConfig.map(widget => {
      const layoutItem = layout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          layout: {
            ...widget.layout,
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        };
      }
      return widget;
    });
    
    setWidgetConfig(updatedConfig);
  }, [widgetConfig, layoutLoading, isEditMode]);

  const handleRefresh = () => {
    setLoading(true);
    // Refresh config and NINA status along with other data
    fetchConfig();
    fetchNinaConnectionStatus();
    setTimeout(() => setLoading(false), 1000);
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Save layout when exiting edit mode
      handleSaveLayout();
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveLayout = async () => {
    try {
      setLoading(true);
      await WidgetService.saveWidgetLayout(widgetConfig);
      console.log('Layout saved successfully');
    } catch (error) {
      console.error('Failed to save layout:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render the appropriate widget component based on config
  const renderWidget = (config: WidgetConfig) => {
    switch (config.component) {
      case 'NINAStatus':
        return <NINAStatus key={config.id} onRefresh={handleRefresh} hideHeader={true} />;
      case 'SystemStatusWidget':
        return <SystemStatusWidget key={config.id} hideHeader={true} />;
      case 'SchedulerWidget':
        return <SchedulerWidget key={config.id} hideHeader={true} />;
      case 'RTSPViewer':
        return <RTSPViewer key={config.id} streams={rtspFeeds} isConnected={true} hideHeader={true} />;
      case 'SessionWidget':
        return <SessionWidgetEnhanced key={config.id} hideHeader={true} />;
      case 'TimeAstronomicalWidget':
        return <TimeAstronomicalWidget key={config.id} onRefresh={handleRefresh} hideHeader={true} />;
      case 'ImageViewer':
        return <ImageViewerWidget key={config.id} onRefresh={handleRefresh} hideHeader={true} />;
      case 'WeatherWidget':
        return <WeatherWidget key={config.id} onRefresh={handleRefresh} hideHeader={true} />;
      case 'GuiderGraphWidget':
        return <GuiderGraphWidget key={config.id} onRefresh={handleRefresh} hideHeader={true} />;
      case 'NINALogsWidget':
        return <NINALogsWidget key={config.id} onRefresh={handleRefresh} hideHeader={true} />;
      case 'LiveStackWidget':
        return <LiveStackWidget key={config.id} onRefresh={handleRefresh} hideHeader={true} />;
      default:
        return <div key={config.id}>Unknown widget: {config.component}</div>;
    }
  };

  return (
    <Box style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Flex 
        direction={{ initial: 'column', md: 'row' }}
        justify={{ md: 'between' }} 
        align={{ initial: 'start', md: 'center' }}
        gap="3"
        p="4" 
        style={{ 
          borderBottom: '1px solid var(--gray-6)',
          background: 'var(--color-background)'
        }}
      >
        {/* Row 1: Title and Settings */}
        <Flex 
          justify="between" 
          align="center"
          width={{ initial: '100%', md: 'auto' }}
          gap="4"
        >
          <Heading as="h1" size={{ initial: '5', md: '6' }}>
            NINA Observatory Dashboard
          </Heading>
          <Flex gap="2" align="center">
            <Button 
              variant="soft"
              onClick={() => setSettingsOpen(true)}
            >
              <GearIcon width="16" height="16" />
              Settings
            </Button>
            {!isMobile && (
              <Button 
                variant="soft"
                onClick={handleEditToggle}
                disabled={loading || layoutLoading}
              >
                {isEditMode ? (
                  <>
                    <CheckIcon width="16" height="16" />
                    Save Layout
                  </>
                ) : (
                  <>
                    <Pencil1Icon width="16" height="16" />
                    Edit Layout
                  </>
                )}
              </Button>
            )}
          </Flex>
        </Flex>

        {/* Row 2: Status and Last Update */}
        <Flex 
          align="center" 
          gap="3"
          justify={{ initial: 'start', md: 'end' }}
          width={{ initial: '100%', md: 'auto' }}
        >
          <Badge 
            color={ninaConnectionStatus.connected ? "green" : "red"} 
            variant="soft"
            size={{ initial: '1', md: '2' }}
          >
            <DotFilledIcon width="8" height="8" />
            {ninaConnectionStatus.connected ? "NINA CONNECTED" : "NINA DISCONNECTED"}
            {ninaConnectionStatus.mockMode && " (MOCK)"}
          </Badge>
          <Text size="2" color="gray">
            Last Update: {new Date().toLocaleTimeString()}
          </Text>
        </Flex>
      </Flex>

      {/* Safety Banner for Observatory Monitoring */}
      <SafetyBanner />

      {/* Conditional Layout - Render only mobile OR desktop, not both */}
      {isMobile ? (
        /* Mobile Layout */
        <Flex direction="column" gap="4" p="4">
          {widgetConfig.map((config) => (
            <div key={config.id}>
              {renderWidget(config)}
            </div>
          ))}
        </Flex>
      ) : (
        /* Desktop Layout - React Grid Layout */
        <Box style={{ padding: '1.5rem' }}>
          {layoutLoading ? (
            <Flex align="center" justify="center" style={{ minHeight: '400px' }}>
              <ReloadIcon className="loading-spinner" />
              <Text ml="2">Loading layout...</Text>
            </Flex>
          ) : (
            <ResponsiveGridLayout
              {...gridLayoutProps}
              {...responsiveProps}
              layouts={{
                lg: getGridLayout(widgetConfig),
                md: getGridLayout(widgetConfig),
                sm: getGridLayout(widgetConfig),
                xs: getGridLayout(widgetConfig),
                xxs: getGridLayout(widgetConfig)
              }}
              onLayoutChange={handleLayoutChange}
              isDraggable={isEditMode}
              isResizable={isEditMode}
              draggableHandle={isEditMode ? ".drag-handle" : ".disabled-drag-handle"}
              margin={[24, 24]}
              containerPadding={[0, 0]}
            >
              {widgetConfig.map((config) => (
                <div key={config.layout.i} className={`widget-container ${isEditMode ? 'edit-mode' : 'view-mode'}`}>
                  {isEditMode && (
                    <div className="drag-handle">
                      <Flex align="center" gap="2">
                        <DragHandleDots2Icon width="14" height="14" />
                        <Text size="2" weight="medium">{config.title}</Text>
                      </Flex>
                    </div>
                  )}
                  {!isEditMode && (
                    <div className="widget-header">
                      <Text size="2" weight="medium" style={{ padding: '8px 12px' }}>{config.title}</Text>
                    </div>
                  )}
                  <div className={`widget-content ${isEditMode ? 'with-header' : 'with-header'}`}>
                    {renderWidget(config)}
                  </div>
                  {isEditMode && (
                    <div className="react-resizable-handle react-resizable-handle-se">
                      <CornerBottomRightIcon />
                    </div>
                  )}
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </Box>
      )}      {/* Settings Modal */}
      <SettingsModal 
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  );
};

export default Dashboard;

