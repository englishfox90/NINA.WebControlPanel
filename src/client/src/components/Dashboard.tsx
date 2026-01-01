import React, { useState, useCallback, useEffect } from 'react';
import { Flex, Box, Button, Badge, Heading, Text } from '@radix-ui/themes';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import NINAStatus from './NINAStatus';
import SystemStatusWidget from './SystemStatusWidget';
import SchedulerWidget from './SchedulerWidget';
import RTSPViewer from './RTSPViewer';
import TimeAstronomicalWidget from './TimeAstronomicalWidget';
import ImageViewerWidget from './ImageViewer';
import WeatherWidget from './WeatherWidget';
import GuiderGraphWidget from './GuiderGraphWidget';
import NINALogsWidget from './NINALogsWidget';
import LiveStackWidget from './LiveStackWidget';
import UnifiedStateWidget from './UnifiedStateWidget';
import PegasusPowerWidget from './PegasusPowerWidget';
import SafetyBanner from './SafetyBanner';
import { SettingsModal } from './SettingsModal';
import OnboardingFlow from './OnboardingFlow';
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
  GearIcon,
  EyeOpenIcon,
  EyeClosedIcon
} from '@radix-ui/react-icons';
import type { NinaConnectionStatus } from '../interfaces/equipment';

// Import react-grid-layout CSS
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Cast to any to avoid React 18 type issues with react-grid-layout
const ResponsiveGridLayout = WidthProvider(Responsive) as any;// Grid layout configuration
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
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Pull-to-refresh state
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get responsive state
  const { isMobile } = useResponsive();

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const response = await fetch(getApiUrl('config'));
        const config = await response.json();

        const completed = config.onboarding?.completed || false;

        // Check URL parameter for forced onboarding
        const urlParams = new URLSearchParams(window.location.search);
        const forceOnboarding = urlParams.get('onboarding') === 'true';

        // Only show onboarding if forced via URL or not completed
        if (forceOnboarding || !completed) {
          setOnboardingOpen(true);
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
      }
    };

    checkOnboarding();
  }, []);

  const handleOnboardingComplete = async () => {
    setOnboardingOpen(false);

    // Remove onboarding URL parameter if present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('onboarding')) {
      urlParams.delete('onboarding');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }

    // Reload configuration and widgets after onboarding
    await fetchConfig();
    await loadWidgets();
  };

  // Load widgets from database
  const loadWidgets = async (includeHidden: boolean = false) => {
    try {
      setLayoutLoading(true);
      const savedWidgets = includeHidden
        ? await WidgetService.loadAllWidgets()
        : await WidgetService.loadWidgets();
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

      // Build feeds array, prioritizing local camera if configured
      const feeds: string[] = [];

      // If local camera path is set, add it as the local camera endpoint
      if (config.streams?.localCameraPath) {
        // Use the server's local camera endpoint
        const serverUrl = window.location.origin.replace(':3000', ':3001');
        feeds.push(`${serverUrl}/api/camera/local`);
      }

      // Add other feeds
      if (config.streams?.liveFeed1) feeds.push(config.streams.liveFeed1);
      if (config.streams?.liveFeed2) feeds.push(config.streams.liveFeed2);
      if (config.streams?.liveFeed3) feeds.push(config.streams.liveFeed3);

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

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only trigger if scrolled to top and not in edit mode
    if (window.scrollY === 0 && !isEditMode && !isRefreshing) {
      setPullStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  }, [isEditMode, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isPulling && pullStartY > 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - pullStartY);

      // Only allow pull down, max 150px
      if (distance > 0 && distance <= 150 && window.scrollY === 0) {
        setPullDistance(distance);
        // Prevent default scrolling when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    }
  }, [isPulling, pullStartY]);

  const handleTouchEnd = useCallback(async () => {
    if (isPulling && pullDistance > 80) {
      // Trigger refresh if pulled more than 80px
      setIsRefreshing(true);
      setPullDistance(60); // Snap to loading position

      // Perform refresh
      await Promise.all([
        fetchConfig(),
        fetchNinaConnectionStatus(),
        new Promise(resolve => setTimeout(resolve, 800)) // Minimum refresh time for UX
      ]);

      // Trigger widget refreshes (especially image widgets)
      setRefreshTrigger(prev => prev + 1);

      setIsRefreshing(false);
    }

    // Reset pull state
    setIsPulling(false);
    setPullStartY(0);
    setPullDistance(0);
  }, [isPulling, pullDistance]);

  // Set up touch event listeners for pull-to-refresh
  useEffect(() => {
    if (!isMobile) return;

    const dashboard = document.querySelector('.dashboard-container');
    if (!dashboard) return;

    dashboard.addEventListener('touchstart', handleTouchStart as any, { passive: true });
    dashboard.addEventListener('touchmove', handleTouchMove as any, { passive: false });
    dashboard.addEventListener('touchend', handleTouchEnd as any, { passive: true });

    return () => {
      dashboard.removeEventListener('touchstart', handleTouchStart as any);
      dashboard.removeEventListener('touchmove', handleTouchMove as any);
      dashboard.removeEventListener('touchend', handleTouchEnd as any);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

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
    // Trigger widget refreshes (especially image widgets)
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setLoading(false), 1000);
  };

  const handleEditToggle = async () => {
    if (isEditMode) {
      // Save layout when exiting edit mode
      await handleSaveLayout();
      // Reload only visible widgets
      loadWidgets(false);
    } else {
      // Load all widgets including hidden when entering edit mode
      loadWidgets(true);
    }
    setIsEditMode(!isEditMode);
  };

  const handleToggleWidgetVisibility = async (widgetId: string, currentEnabled: boolean, event: React.MouseEvent) => {
    // Stop event propagation to prevent drag behavior
    event.stopPropagation();
    event.preventDefault();

    try {
      await WidgetService.toggleWidgetVisibility(widgetId, !currentEnabled);
      // Update local state
      setWidgetConfig(prev => prev.map(w =>
        w.id === widgetId ? { ...w, enabled: !currentEnabled } : w
      ));
    } catch (error) {
      console.error('Failed to toggle widget visibility:', error);
    }
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
        return <RTSPViewer key={`${config.id}-${refreshTrigger}`} streams={rtspFeeds} isConnected={true} hideHeader={true} />;
      case 'TimeAstronomicalWidget':
        return <TimeAstronomicalWidget key={config.id} onRefresh={handleRefresh} hideHeader={true} />;
      case 'ImageViewer':
        return <ImageViewerWidget key={`${config.id}-${refreshTrigger}`} onRefresh={handleRefresh} hideHeader={true} />;
      case 'WeatherWidget':
        return <WeatherWidget key={config.id} onRefresh={handleRefresh} hideHeader={true} />;
      case 'GuiderGraphWidget':
        return <GuiderGraphWidget key={config.id} onRefresh={handleRefresh} hideHeader={true} />;
      case 'NINALogsWidget':
        return <NINALogsWidget key={config.id} onRefresh={handleRefresh} hideHeader={true} />;
      case 'LiveStackWidget':
        return <LiveStackWidget key={`${config.id}-${refreshTrigger}`} onRefresh={handleRefresh} hideHeader={true} />;
      case 'UnifiedStateTestWidget':
      case 'UnifiedStateWidget':
        return <UnifiedStateWidget key={config.id} />;
      case 'PegasusPowerWidget':
        return <PegasusPowerWidget key={config.id} widgetId={config.id} />;
      default:
        return <div key={config.id}>Unknown widget: {config.component}</div>;
    }
  };

  return (
    <Box style={{ minHeight: '100vh' }} className="dashboard-container">
      {/* Pull-to-refresh indicator */}
      {isMobile && (isPulling || isRefreshing) && (
        <Box
          style={{
            position: 'fixed',
            top: '0',
            left: '50%',
            transform: `translate(-50%, ${Math.min(pullDistance, 60)}px)`,
            zIndex: 9999,
            transition: isRefreshing ? 'transform 0.2s ease-out' : 'none',
            opacity: Math.min(pullDistance / 80, 1)
          }}
        >
          <Flex
            align="center"
            justify="center"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--accent-9)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            <ReloadIcon
              width="20"
              height="20"
              color="white"
              className={isRefreshing ? 'loading-spinner' : ''}
              style={{
                transform: `rotate(${pullDistance * 3}deg)`,
                transition: isRefreshing ? 'none' : 'transform 0.1s ease-out'
              }}
            />
          </Flex>
        </Box>
      )}

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
          {widgetConfig.filter(w => w.enabled !== false).map((config) => (
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
                lg: getGridLayout(isEditMode ? widgetConfig : widgetConfig.filter(w => w.enabled !== false)),
                md: getGridLayout(isEditMode ? widgetConfig : widgetConfig.filter(w => w.enabled !== false)),
                sm: getGridLayout(isEditMode ? widgetConfig : widgetConfig.filter(w => w.enabled !== false)),
                xs: getGridLayout(isEditMode ? widgetConfig : widgetConfig.filter(w => w.enabled !== false)),
                xxs: getGridLayout(isEditMode ? widgetConfig : widgetConfig.filter(w => w.enabled !== false))
              }}
              onLayoutChange={handleLayoutChange}
              isDraggable={isEditMode}
              isResizable={isEditMode}
              draggableHandle={isEditMode ? ".drag-handle" : ".disabled-drag-handle"}
              margin={[24, 24]}
              containerPadding={[0, 0]}
            >
              {(isEditMode ? widgetConfig : widgetConfig.filter(w => w.enabled !== false)).map((config) => (
                <div key={config.layout.i} className={`widget-container ${isEditMode ? 'edit-mode' : 'view-mode'} ${!config.enabled && isEditMode ? 'widget-hidden' : ''}`}>
                  {isEditMode && (
                    <div className="drag-handle">
                      <Flex align="center" gap="2" justify="between">
                        <Flex align="center" gap="2">
                          <DragHandleDots2Icon width="14" height="14" />
                          <Text size="2" weight="medium">{config.title}</Text>
                        </Flex>
                        <Button
                          size="1"
                          variant="ghost"
                          color={config.enabled !== false ? "gray" : "red"}
                          onClick={(e) => handleToggleWidgetVisibility(config.id, config.enabled !== false, e)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          style={{ cursor: 'pointer' }}
                        >
                          {config.enabled !== false ? <EyeOpenIcon width="14" height="14" /> : <EyeClosedIcon width="14" height="14" />}
                        </Button>
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

      {/* Onboarding Flow */}
      <OnboardingFlow
        isOpen={onboardingOpen}
        onComplete={handleOnboardingComplete}
      />
    </Box>
  );
};

export default Dashboard;

