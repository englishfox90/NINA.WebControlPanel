// Streamlined Guider Graph Widget - Real-time PHD2/NINA guiding performance monitoring
// Modularized architecture with config support and time-based measurements
// ENHANCED: Listens to unified state WebSocket for guiding start/stop events

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, TimeScale, LineController, BarController } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { Card, Flex, Text, Badge, Spinner, Callout, Button } from '@radix-ui/themes';
import { UpdateIcon, ExclamationTriangleIcon, PlayIcon, StopIcon } from '@radix-ui/react-icons';
import { toast } from 'sonner';

import { GuiderService, GuiderState, GuiderEventData } from '../services/guiderService';
import { processGuideStepsForChart, getTimeBasedChartOptions, ChartTimeSettings } from '../utils/guiderChart';
import { getApiUrl } from '../config/api';
import { GuiderGraphWidgetProps } from '../interfaces/nina';
import { useUnifiedState } from '../contexts/UnifiedStateContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, TimeScale, LineController, BarController
);

const GuiderGraphWidget: React.FC<GuiderGraphWidgetProps> = ({ 
  onRefresh, 
  hideHeader = false 
}) => {
  const [guiderService, setGuiderService] = useState<GuiderService | null>(null);
  const [state, setState] = useState<GuiderState>({
    data: null,
    loading: true,
    error: null,
    isGuidingActive: false,
    guiderConnected: false,
    exposureDuration: 2.0
  });
  const [configLoaded, setConfigLoaded] = useState(false);

  // Listen to unified state for guiding events
  const { state: unifiedState, lastUpdate } = useUnifiedState();
  const lastGuidingState = useRef<boolean | null>(null);
  const lastUpdateTime = useRef<string | null>(null);

  // Load configuration and initialize guider service
  useEffect(() => {
    let isMounted = true;
    
    const loadConfigAndInitialize = async () => {
      try {
        // Load configuration to get guider exposure duration
        const response = await fetch(getApiUrl('config'));
        let exposureDuration = 2.0;
        
        if (response.ok) {
          const config = await response.json();
          exposureDuration = config.nina?.guiderExposureDuration || 2.0;
        } else {
          console.warn('Failed to load configuration, using default exposure duration');
        }
        
        // Only proceed if component is still mounted
        if (!isMounted) return;
        
        // Initialize guider service with exposure duration from config
        const service = new GuiderService(exposureDuration);
        
        // Subscribe to state changes
        service.onStateChange((newState) => {
          if (isMounted) {
            setState(newState);
          }
        });
        
        // Subscribe to guider events for logging
        service.onEvent((event: GuiderEventData) => {
          console.log(`🎯 Guider event in widget: ${event.type}`);
        });
        
        setGuiderService(service);
        setConfigLoaded(true);
        
        // Initialize data fetch (single call)
        await service.initialize();
          
      } catch (error) {
        console.error('Error loading configuration:', error);
        if (isMounted) {
          // Fallback to default settings - single initialization path
          const service = new GuiderService(2.0);
          service.onStateChange((newState) => {
            if (isMounted) setState(newState);
          });
          setGuiderService(service);
          setConfigLoaded(true);
          await service.initialize();
        }
      }
    };

    loadConfigAndInitialize();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (guiderService) {
        guiderService.destroy();
      }
    };
  }, []); // Empty dependency array - run once on mount

  // Listen for guiding start/stop events from unified state WebSocket
  useEffect(() => {
    if (lastUpdate?.updateKind === 'session' && lastUpdate?.timestamp !== lastUpdateTime.current) {
      const isGuiding = unifiedState?.currentSession?.guiding?.isGuiding;
      
      // Check for state change
      if (isGuiding !== lastGuidingState.current && isGuiding !== null && isGuiding !== undefined) {
        lastUpdateTime.current = lastUpdate.timestamp;
        lastGuidingState.current = isGuiding;
        
        if (lastUpdate.updateReason === 'guiding-started') {
          console.log('🟢 Guiding started');
          toast.success('Guiding Started', {
            description: 'PHD2/NINA guiding is now active',
            duration: 3000
          });
          
          // Update local state and refresh data
          setState(prev => ({ ...prev, isGuidingActive: true }));
          if (guiderService) {
            guiderService.fetchGuiderData();
          }
        } else if (lastUpdate.updateReason === 'guiding-stopped') {
          console.log('🔴 Guiding stopped');
          toast.info('Guiding Stopped', {
            description: 'PHD2/NINA guiding has been stopped',
            duration: 3000
          });
          
          // Update local state
          setState(prev => ({ ...prev, isGuidingActive: false }));
        }
      }
    }
  }, [lastUpdate, unifiedState?.currentSession?.guiding?.isGuiding, guiderService]);

  // Configuration changes handled via manual refresh only
  useEffect(() => {
    if (!configLoaded || !guiderService) return;
  }, [configLoaded, guiderService]);

  // Manual refresh handler
  const handleRefresh = async () => {
    if (guiderService) {
      await guiderService.fetchGuiderData();
    }
    if (onRefresh) {
      onRefresh();
    }
  };

  // Chart settings based on exposure duration and current state
  const chartTimeSettings: ChartTimeSettings = useMemo(() => ({
    exposureDuration: state.exposureDuration,
    useTimeLabels: true, // Use time-based labels for better UX
    maxHistoryMinutes: 30 // Show last 30 minutes of guiding data
  }), [state.exposureDuration]);

  // Process guide steps for time-based chart display - memoized to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    if (!state.data?.Response?.GuideSteps) {
      console.log('🎯 No guide steps data available');
      return { labels: [], datasets: [] };
    }

    const steps = state.data.Response.GuideSteps;
    // Reduced logging to prevent console spam
    if (steps.length > 0) {
      console.log(`🎯 Processing ${steps.length} guide steps for chart display`);
    }

    const chartData = processGuideStepsForChart(
      steps,
      chartTimeSettings
    );

    // Only log when there's a significant change
    if (chartData.labels.length !== steps.length) {
      console.log(`🎯 Chart data processed: ${chartData.labels.length} labels, ${chartData.datasets.length} datasets`);
    }

    return chartData;
  }, [state.data?.Response?.GuideSteps, chartTimeSettings]);

  // Generate chart options with time-based configuration
  const chartOptions = useMemo(() => {
    const stepCount = state.data?.Response?.GuideSteps?.length || 0;
    return getTimeBasedChartOptions(
      chartTimeSettings,
      stepCount,
      state.data?.Response
    );
  }, [state.data, chartTimeSettings]);

  // Loading state
  if (!configLoaded || state.loading) {
    return (
      <Card className="guider-graph-widget" style={{ minHeight: '400px' }}>
        {!hideHeader && (
          <Flex justify="between" align="center" p="4" style={{ borderBottom: '1px solid var(--gray-6)' }}>
            <Text weight="medium">Guider Graph</Text>
          </Flex>
        )}
        <Flex justify="center" align="center" style={{ height: '350px' }}>
          <Spinner size="3" />
        </Flex>
      </Card>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Card className="guider-graph-widget" style={{ minHeight: '400px' }}>
        {!hideHeader && (
          <Flex justify="between" align="center" p="4" style={{ borderBottom: '1px solid var(--gray-6)' }}>
            <Text weight="medium">Guider Graph</Text>
            <Button size="1" variant="soft" onClick={handleRefresh}>
              <UpdateIcon />
            </Button>
          </Flex>
        )}
        <Flex direction="column" gap="3" p="4">
          <Callout.Root color="red">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{state.error}</Callout.Text>
          </Callout.Root>
          <Button size="2" variant="soft" onClick={handleRefresh}>
            <UpdateIcon />
            Try Again
          </Button>
        </Flex>
      </Card>
    );
  }

  if (!state.data) return null;

  const rms = state.data.Response?.RMS;

  return (
    <Card className="guider-graph-widget" style={{ minHeight: '400px' }}>
      {!hideHeader && (
        <Flex justify="between" align="center" p="4" style={{ borderBottom: '1px solid var(--gray-6)' }}>
          <Flex align="center" gap="2">
            <Text weight="medium">Guider Graph</Text>
            <Badge 
              color={state.guiderConnected ? (unifiedState?.currentSession?.guiding?.isGuiding ? 'green' : 'blue') : 'gray'}
              size="1"
            >
              {unifiedState?.currentSession?.guiding?.isGuiding ? <PlayIcon /> : <StopIcon />}
              {unifiedState?.currentSession?.guiding?.isGuiding ? 'Guiding' : state.guiderConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </Flex>
          <Flex align="center" gap="2">
            <Text size="1" color="gray">
              {state.exposureDuration}s exposure
            </Text>
            <Button size="1" variant="soft" onClick={handleRefresh}>
              <UpdateIcon />
            </Button>
          </Flex>
        </Flex>
      )}
      
      <Flex direction="column" p="4" gap="3">
        {/* RMS Statistics */}
        {rms && (
          <Flex justify="center" gap="6" py="2">
            <Flex direction="column" align="center" gap="1">
              <Text size="1" color="gray">RA RMS</Text>
              <Text weight="bold" style={{ color: 'hsl(206, 100%, 55%)' }}>
                {rms.RA?.toFixed(2) || '0.00'}"
              </Text>
              {rms.PeakRA && (
                <Text size="1" color="gray">
                  Peak: {rms.PeakRA.toFixed(2)}"
                </Text>
              )}
            </Flex>
            <Flex direction="column" align="center" gap="1">
              <Text size="1" color="gray">Dec RMS</Text>
              <Text weight="bold" style={{ color: 'hsl(358, 75%, 59%)' }}>
                {rms.Dec?.toFixed(2) || '0.00'}"
              </Text>
              {rms.PeakDec && (
                <Text size="1" color="gray">
                  Peak: {rms.PeakDec.toFixed(2)}"
                </Text>
              )}
            </Flex>
            <Flex direction="column" align="center" gap="1">
              <Text size="1" color="gray">Total RMS</Text>
              <Text weight="bold" style={{ color: 'hsl(142, 70%, 45%)' }}>
                {rms.Total?.toFixed(2) || '0.00'}"
              </Text>
              <Text size="1" color="gray">
                {rms.TotalText}
              </Text>
            </Flex>
          </Flex>
        )}

        {/* Chart */}
        <div style={{ height: '300px', position: 'relative' }}>
          {state.data?.Response?.GuideSteps?.length > 0 ? (
            chartData.datasets.length > 0 ? (
              <Chart type="line" data={chartData} options={chartOptions} />
            ) : (
              <Flex direction="column" justify="center" align="center" gap="2" style={{ height: '100%' }}>
                <Text color="orange">Chart processing issue</Text>
                <Text size="1" color="gray">
                  {state.data.Response.GuideSteps.length} guide steps available but chart data is empty
                </Text>
              </Flex>
            )
          ) : (
            <Flex justify="center" align="center" style={{ height: '100%' }}>
              <Text color="gray">
                {state.guiderConnected ? 
                  (unifiedState?.currentSession?.guiding?.isGuiding ? 'Waiting for guide steps...' : 'Guider connected, not actively guiding') : 
                  'No guiding data available'}
              </Text>
            </Flex>
          )}
        </div>

        {/* Status Footer */}
        <Flex justify="between" align="center" pt="2" style={{ borderTop: '1px solid var(--gray-6)' }}>
          <Text size="1" color="gray">
            History: {state.data.Response?.GuideSteps?.length || 0} steps
          </Text>
          <Text size="1" color="gray">
            Interval: {chartTimeSettings.exposureDuration}s | Scale: 2.99"/px
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
};

export default React.memo(GuiderGraphWidget);
