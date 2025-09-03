// Guider Graph Widget - Real-time PHD2/NINA guiding performance monitoring
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Flex, Text, Badge, HoverCard, Box, Button } from '@radix-ui/themes';
import { 
  ActivityLogIcon,
  ReloadIcon,
  ExclamationTriangleIcon
} from '@radix-ui/react-icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  LineController,
  BarController
} from 'chart.js';
import { Chart } from 'react-chartjs-2'; // Using generic Chart for mixed types
import 'chartjs-adapter-date-fns'; // For time-based X-axis
import type { GuiderGraphResponse, GuiderGraphWidgetProps } from '../interfaces/nina';
import { getApiUrl } from '../config/api';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement, // For bar chart overlay
  Title,
  Tooltip,
  Legend,
  TimeScale,
  LineController,
  BarController
);

const GuiderGraphWidget: React.FC<GuiderGraphWidgetProps> = ({ 
  onRefresh, 
  hideHeader = false 
}) => {
  const [guiderData, setGuiderData] = useState<GuiderGraphResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuidingActive, setIsGuidingActive] = useState(false);
  const [guiderConnected, setGuiderConnected] = useState(false);

  const fetchGuiderData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(getApiUrl('nina/guider-graph'));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Handle null response (no mock data fallback)
      if (!data || data === null) {
        setGuiderData(null);
        setGuiderConnected(false);
        setIsGuidingActive(false);
        setError('No guider data available from NINA');
        return;
      }
      
      setGuiderData(data);
      setGuiderConnected(data.connected || false);
      setIsGuidingActive(data.isGuiding || false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setGuiderConnected(false);
      setIsGuidingActive(false);
      setGuiderData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket event handlers for guider events
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.Event?.startsWith('GUIDER-')) {
          console.log('🎯 Guider event received:', data.Event);
          
          // Update state based on event
          if (data.Event === 'GUIDER-CONNECTED') {
            setGuiderConnected(true);
          } else if (data.Event === 'GUIDER-DISCONNECTED') {
            setGuiderConnected(false);
            setIsGuidingActive(false);
          } else if (data.Event === 'GUIDER-START') {
            setIsGuidingActive(true);
          } else if (data.Event === 'GUIDER-STOP') {
            setIsGuidingActive(false);
          }
          
          // Refresh data after a short delay to get updated information
          setTimeout(() => {
            fetchGuiderData();
          }, data.Event.includes('CONNECTED') ? 2000 : 1000);
        }
      } catch (err) {
        console.warn('Error parsing WebSocket message:', err);
      }
    };

    // Connect to existing WebSocket system
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:3001/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.addEventListener('message', handleWebSocketMessage);
    
    return () => ws.close();
  }, [fetchGuiderData]);

  // Adaptive polling based on guiding state - only poll when actively guiding
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isGuidingActive && guiderConnected) {
      // Active guiding: refresh every 5 seconds for live updates
      console.log('🔄 Starting active guiding data polling (5s interval)');
      interval = setInterval(fetchGuiderData, 5000);
    }
    // No polling when not actively guiding - rely on WebSocket events only
    
    return () => {
      if (interval) {
        console.log('⏹️ Stopping guiding data polling');
        clearInterval(interval);
      }
    };
  }, [isGuidingActive, guiderConnected, fetchGuiderData]);

  // Initial data fetch
  useEffect(() => {
    fetchGuiderData();
  }, [fetchGuiderData]);

  // Process guide steps for chart display
  const chartData = useMemo(() => {
    if (!guiderData?.Response?.GuideSteps || guiderData.Response.GuideSteps.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    const guideSteps = guiderData.Response.GuideSteps;
    const labels = guideSteps.map((_: any, index: number) => index + 1); // Use step numbers instead of time

    return {
      labels,
      datasets: [
        {
          type: 'line' as const,
          label: 'RA Error (")',
          data: guideSteps.map((step: any) => step.RADistanceRawDisplay),
          borderColor: 'hsl(206, 100%, 55%)', // Blue - Radix primary
          backgroundColor: 'hsla(206, 100%, 55%, 0.1)',
          yAxisID: 'yError',
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 4,
          borderWidth: 2
        },
        {
          type: 'line' as const,
          label: 'Dec Error (")',
          data: guideSteps.map((step: any) => step.DECDistanceRawDisplay),
          borderColor: 'hsl(358, 75%, 59%)', // Red - Radix error color
          backgroundColor: 'hsla(358, 75%, 59%, 0.1)',
          yAxisID: 'yError',
          tension: 0.1,
          pointRadius: 2,
          pointHoverRadius: 4,
          borderWidth: 2
        },
        {
          type: 'bar' as const,
          label: 'RA Duration (ms)',
          data: guideSteps.map((step: any) => step.RADuration),
          backgroundColor: 'hsla(206, 100%, 55%, 0.3)',
          borderColor: 'hsl(206, 100%, 45%)',
          yAxisID: 'yDuration',
          barThickness: 3,
          borderWidth: 1
        },
        {
          type: 'bar' as const,
          label: 'Dec Duration (ms)',
          data: guideSteps.map((step: any) => step.DECDuration),
          backgroundColor: 'hsla(358, 75%, 59%, 0.3)',
          borderColor: 'hsl(358, 75%, 49%)',
          yAxisID: 'yDuration',
          barThickness: 3,
          borderWidth: 1
        }
      ]
    };
  }, [guiderData]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear' as const,
        title: {
          display: true,
          text: 'Guide Step',
          color: 'rgb(255, 255, 255)'
        },
        ticks: {
          color: 'rgb(200, 200, 200)',
          stepSize: Math.max(1, Math.floor((guiderData?.Response?.GuideSteps?.length || 10) / 10)),
          callback: function(value: any) {
            return `#${Math.floor(value)}`;
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        }
      },
      yError: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Guide Error (arcsec)',
          color: 'rgb(255, 255, 255)'
        },
        ticks: {
          color: 'rgb(200, 200, 200)',
          callback: function(value: any) {
            return value.toFixed(1) + '"';
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        max: guiderData?.Response?.MaxY || 2,
        min: guiderData?.Response?.MinY || -2
      },
      yDuration: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Correction Duration (ms)',
          color: 'rgb(255, 255, 255)'
        },
        ticks: {
          color: 'rgb(200, 200, 200)'
        },
        grid: {
          drawOnChartArea: false,
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false
        },
        max: guiderData?.Response?.MaxDurationY || 200,
        min: guiderData?.Response?.MinDurationY || 0
      }
    },
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          color: 'rgb(255, 255, 255)'
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'rgb(255, 255, 255)',
        bodyColor: 'rgb(200, 200, 200)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          title: function(context: any) {
            if (context[0]?.parsed?.x !== undefined) {
              return `Guide Step #${Math.floor(context[0].parsed.x)}`;
            }
            return '';
          },
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (label.includes('Duration')) {
                label += context.parsed.y + 'ms';
              } else {
                label += context.parsed.y.toFixed(2) + '"';
              }
            }
            return label;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      intersect: false
    }
  }), [guiderData]);

  if (loading) {
    return (
      <Card className="guider-graph-widget" style={{ minHeight: '400px' }}>
        {!hideHeader && (
          <Flex align="center" gap="2" className="mb-3">
            <ActivityLogIcon />
            <Text size="3" weight="medium">Guider Graph</Text>
            <ReloadIcon className="animate-spin ml-auto" />
          </Flex>
        )}
        <Flex align="center" justify="center" style={{ height: '300px' }}>
          <Text color="gray">Loading guider data...</Text>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="guider-graph-widget" style={{ minHeight: '400px' }}>
        {!hideHeader && (
          <Flex align="center" gap="2" className="mb-3">
            <ExclamationTriangleIcon color="red" />
            <Text size="3" weight="medium">Guider Graph</Text>
          </Flex>
        )}
        <Flex direction="column" align="center" justify="center" gap="3" style={{ height: '300px' }}>
          <Text color="red" size="2">{error}</Text>
          <Button onClick={() => fetchGuiderData()} variant="outline">
            <ReloadIcon />
            Retry
          </Button>
        </Flex>
      </Card>
    );
  }

  if (!guiderData) return null;

  const rms = guiderData.Response?.RMS;

  return (
    <Card className="guider-graph-widget" style={{ minHeight: '400px' }}>
      {!hideHeader && (
        <Flex justify="between" align="center" className="mb-3">
          <Flex align="center" gap="2">
            <ActivityLogIcon />
            <Text size="3" weight="medium">Guider Graph</Text>
            <Badge 
              color={guiderConnected ? (isGuidingActive ? 'green' : 'blue') : 'red'}
              variant="soft"
            >
              {guiderConnected ? (isGuidingActive ? 'Guiding' : 'Connected') : 'Disconnected'}
            </Badge>
          </Flex>
          {onRefresh && (
            <Button onClick={() => { fetchGuiderData(); onRefresh?.(); }} variant="ghost" size="2">
              <ReloadIcon />
            </Button>
          )}
        </Flex>
      )}
      
      <Flex direction="column" gap="3">
        {/* RMS Statistics Row */}
        {rms && (
          <Flex gap="4" justify="center" style={{ marginBottom: '10px' }}>
            <HoverCard.Root>
              <HoverCard.Trigger>
                <Flex direction="column" align="center" style={{ cursor: 'help' }}>
                  <Text size="1" color="gray">RA RMS</Text>
                  <Text size="3" weight="bold" style={{ color: 'hsl(206, 100%, 55%)' }}>{rms.RAText}</Text>
                </Flex>
              </HoverCard.Trigger>
              <HoverCard.Content>
                <Flex direction="column" gap="1">
                  <Text size="2" weight="bold">Right Ascension RMS</Text>
                  <Text size="1">Peak: {rms.PeakRAText}</Text>
                  <Text size="1">Data Points: {rms.DataPoints}</Text>
                </Flex>
              </HoverCard.Content>
            </HoverCard.Root>

            <HoverCard.Root>
              <HoverCard.Trigger>
                <Flex direction="column" align="center" style={{ cursor: 'help' }}>
                  <Text size="1" color="gray">Dec RMS</Text>
                  <Text size="3" weight="bold" style={{ color: 'hsl(358, 75%, 59%)' }}>{rms.DecText}</Text>
                </Flex>
              </HoverCard.Trigger>
              <HoverCard.Content>
                <Flex direction="column" gap="1">
                  <Text size="2" weight="bold">Declination RMS</Text>
                  <Text size="1">Peak: {rms.PeakDecText}</Text>
                  <Text size="1">Data Points: {rms.DataPoints}</Text>
                </Flex>
              </HoverCard.Content>
            </HoverCard.Root>

            <HoverCard.Root>
              <HoverCard.Trigger>
                <Flex direction="column" align="center" style={{ cursor: 'help' }}>
                  <Text size="1" color="gray">Total RMS</Text>
                  <Text size="3" weight="bold" style={{ color: 'hsl(151, 55%, 41%)' }}>{rms.TotalText}</Text>
                </Flex>
              </HoverCard.Trigger>
              <HoverCard.Content>
                <Flex direction="column" gap="1">
                  <Text size="2" weight="bold">Combined RMS Error</Text>
                  <Text size="1">√(RA² + Dec²)</Text>
                  <Text size="1">Pixel Scale: {guiderData.Response?.PixelScale?.toFixed(2)}"/px</Text>
                </Flex>
              </HoverCard.Content>
            </HoverCard.Root>
          </Flex>
        )}

        {/* Chart */}
        <Box style={{ height: '300px', position: 'relative' }}>
          {chartData.labels.length > 0 ? (
            <Chart type="line" data={chartData} options={chartOptions} />
          ) : (
            <Flex align="center" justify="center" direction="column" gap="2" style={{ height: '100%' }}>
              <Text color="gray" size="2">
                {!guiderConnected 
                  ? 'Guider not connected'
                  : !isGuidingActive 
                    ? 'Guiding hasn\'t started yet'
                    : 'No guide data available from NINA'
                }
              </Text>
              {guiderConnected && !isGuidingActive && (
                <Text color="gray" size="1">
                  Start guiding in NINA to see live performance data
                </Text>
              )}
            </Flex>
          )}
        </Box>

        {/* Guide Information */}
        {guiderData.Response && (
          <Flex justify="between" style={{ fontSize: '12px', color: 'var(--gray-11)' }}>
            <Text size="1">
              Interval: {guiderData.Response.Interval}s
            </Text>
            <Text size="1">
              History: {guiderData.Response.HistorySize} steps
            </Text>
            <Text size="1">
              Scale: {guiderData.Response.PixelScale?.toFixed(2)}"/px
            </Text>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

// Apply React.memo for performance optimization
export default React.memo(GuiderGraphWidget);
