// CACHE INVALIDATION v2.0 - completely updated widget with individual hover cards
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Flex, Text, Badge, HoverCard, Box } from '@radix-ui/themes';
import { 
  ClockIcon,
  ReloadIcon,
  ExclamationTriangleIcon
} from '@radix-ui/react-icons';
import { 
  WiSunrise, 
  WiSunset,
  WiMoonNew,
  WiMoonWaxingCrescent3,
  WiMoonFirstQuarter,
  WiMoonWaxingGibbous3,
  WiMoonFull,
  WiMoonWaningGibbous3,
  WiMoonThirdQuarter,
  WiMoonWaningCrescent3
} from 'weather-icons-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { TimeAstronomicalData } from '../types/dashboard';
import { getApiUrl } from '../config/api';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface TimeAstronomicalWidgetProps {
  onRefresh?: () => void;
  hideHeader?: boolean;
}

interface TimePhase {
  name: string;
  start: Date;
  end: Date;
  color: string;
  description: string;
  // Store the real phase times for tooltip display
  realStart: Date;
  realEnd: Date;
}

const TimeAstronomicalWidget: React.FC<TimeAstronomicalWidgetProps> = ({ 
  onRefresh, 
  hideHeader = false 
}) => {
  const [data, setData] = useState<TimeAstronomicalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(getApiUrl('time/astronomical'));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching astronomical data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch astronomical data');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Real-time clock update every second - memoized to prevent phase recalculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh data every 30 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 30 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Format time for display
  const formatTime12Hour = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeShort12Hour = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get moon phase icon
  const getMoonIcon = (phase: string) => {
    const iconProps = { size: 28, color: 'var(--amber-9)' };
    
    switch (phase) {
      case 'new_moon': return <WiMoonNew {...iconProps} />;
      case 'waxing_crescent': return <WiMoonWaxingCrescent3 {...iconProps} />;
      case 'first_quarter': return <WiMoonFirstQuarter {...iconProps} />;
      case 'waxing_gibbous': return <WiMoonWaxingGibbous3 {...iconProps} />;
      case 'full_moon': return <WiMoonFull {...iconProps} />;
      case 'waning_gibbous': return <WiMoonWaningGibbous3 {...iconProps} />;
      case 'last_quarter': return <WiMoonThirdQuarter {...iconProps} />;
      case 'waning_crescent': return <WiMoonWaningCrescent3 {...iconProps} />;
      default: return <WiMoonNew {...iconProps} />;
    }
  };

  // Generate 8-hour window phases using multi-day data - memoized to prevent console spam
  const phases = useMemo((): TimePhase[] => {
    if (!data?.astronomical?.multiDay?.today?.date) {
      console.log('⚠️ MultiDay data not available, skipping phase calculations');
      return [];
    }

    const phases: TimePhase[] = [];
    // Use the 'today' date from the astronomical data to ensure consistency
    const todayDateStr = data.astronomical.multiDay.today.date;
    const referenceDate = new Date(`${todayDateStr}T${new Date().toTimeString().split(' ')[0]}`);
    const windowStart = new Date(referenceDate.getTime() - 4 * 60 * 60 * 1000); // 4 hours before
    const windowEnd = new Date(referenceDate.getTime() + 4 * 60 * 60 * 1000); // 4 hours after

    const { yesterday, today, tomorrow } = data.astronomical.multiDay;

    // Helper function to add phase if it intersects with our 8-hour window
    const addPhaseIfVisible = (start: Date, end: Date, name: string, color: string, description: string) => {
      // Check if phase intersects with our window
      if (start < windowEnd && end > windowStart) {
        // Clamp to window boundaries for chart display
        const clampedStart = start < windowStart ? windowStart : start;
        const clampedEnd = end > windowEnd ? windowEnd : end;
        
        phases.push({
          name,
          start: clampedStart,  // Used for chart display
          end: clampedEnd,      // Used for chart display
          color,
          description,
          realStart: start,     // Real phase start time for tooltip
          realEnd: end          // Real phase end time for tooltip
        });
      }
    };

    // Helper to create dates from yesterday, today, tomorrow with proper timezone handling
    const createDate = (dateStr: string, timeStr: string): Date => {
      // Create date in local timezone to match the API data which is already in local time
      const date = new Date(`${dateStr}T${timeStr}`);
      return date;
    };

    // Add yesterday's evening phases if they extend into our window
    if (yesterday.sunset) {
      addPhaseIfVisible(
        createDate(yesterday.date, yesterday.sunset),
        yesterday.civilTwilightEnd ? createDate(yesterday.date, yesterday.civilTwilightEnd) : new Date(createDate(yesterday.date, yesterday.sunset).getTime() + 60*60*1000),
        'Civil Dusk',
        '#FFA500',
        'Golden hour after sunset'
      );
    }

    if (yesterday.civilTwilightEnd && yesterday.nauticalTwilightEnd) {
      addPhaseIfVisible(
        createDate(yesterday.date, yesterday.civilTwilightEnd),
        createDate(yesterday.date, yesterday.nauticalTwilightEnd),
        'Nautical Dusk',
        '#4169E1',
        'Deep blue twilight'
      );
    }

    if (yesterday.nauticalTwilightEnd && yesterday.astronomicalTwilightEnd) {
      addPhaseIfVisible(
        createDate(yesterday.date, yesterday.nauticalTwilightEnd),
        createDate(yesterday.date, yesterday.astronomicalTwilightEnd),
        'Astronomical Dusk',
        '#191970',
        'Last light of day'
      );
    }

    // Night phase from yesterday astronomical end to today astronomical begin
    if (yesterday.astronomicalTwilightEnd) {
      const nightStart = createDate(yesterday.date, yesterday.astronomicalTwilightEnd);
      const nightEnd = today.astronomicalTwilightBegin ? 
        createDate(today.date, today.astronomicalTwilightBegin) : 
        new Date(nightStart.getTime() + 8*60*60*1000);
      
      addPhaseIfVisible(nightStart, nightEnd, 'Night', '#000080', 'Complete darkness');
    }

    // Add today's phases
    if (today.astronomicalTwilightBegin && today.nauticalTwilightBegin) {
      addPhaseIfVisible(
        createDate(today.date, today.astronomicalTwilightBegin),
        createDate(today.date, today.nauticalTwilightBegin),
        'Astronomical Dawn',
        '#191970',
        'First light of dawn'
      );
    }

    if (today.nauticalTwilightBegin && today.civilTwilightBegin) {
      addPhaseIfVisible(
        createDate(today.date, today.nauticalTwilightBegin),
        createDate(today.date, today.civilTwilightBegin),
        'Nautical Dawn',
        '#4169E1',
        'Early morning twilight'
      );
    }

    if (today.civilTwilightBegin && today.sunrise) {
      addPhaseIfVisible(
        createDate(today.date, today.civilTwilightBegin),
        createDate(today.date, today.sunrise),
        'Civil Dawn',
        '#FFA500',
        'Golden hour before sunrise'
      );
    }

    if (today.sunrise && today.sunset) {
      const sunriseDate = createDate(today.date, today.sunrise);
      const sunsetDate = createDate(today.date, today.sunset);
      
      addPhaseIfVisible(
        sunriseDate,
        sunsetDate,
        'Daylight',
        '#FFD700',
        'Full daylight'
      );
    }

    if (today.sunset && today.civilTwilightEnd) {
      addPhaseIfVisible(
        createDate(today.date, today.sunset),
        createDate(today.date, today.civilTwilightEnd),
        'Civil Dusk',
        '#FFA500',
        'Golden hour after sunset'
      );
    }

    if (today.civilTwilightEnd && today.nauticalTwilightEnd) {
      addPhaseIfVisible(
        createDate(today.date, today.civilTwilightEnd),
        createDate(today.date, today.nauticalTwilightEnd),
        'Nautical Dusk',
        '#4169E1',
        'Deep blue twilight'
      );
    }

    if (today.nauticalTwilightEnd && today.astronomicalTwilightEnd) {
      addPhaseIfVisible(
        createDate(today.date, today.nauticalTwilightEnd),
        createDate(today.date, today.astronomicalTwilightEnd),
        'Astronomical Dusk',
        '#191970',
        'Last light of day'
      );
    }

    // Night phase from today astronomical end to tomorrow astronomical begin
    if (today.astronomicalTwilightEnd) {
      const nightStart = createDate(today.date, today.astronomicalTwilightEnd);
      const nightEnd = tomorrow.astronomicalTwilightBegin ? 
        createDate(tomorrow.date, tomorrow.astronomicalTwilightBegin) : 
        new Date(nightStart.getTime() + 8*60*60*1000);
      
      addPhaseIfVisible(nightStart, nightEnd, 'Night', '#000080', 'Complete darkness');
    }

    // Add tomorrow's morning phases if they're in our window
    if (tomorrow.astronomicalTwilightBegin && tomorrow.nauticalTwilightBegin) {
      addPhaseIfVisible(
        createDate(tomorrow.date, tomorrow.astronomicalTwilightBegin),
        createDate(tomorrow.date, tomorrow.nauticalTwilightBegin),
        'Astronomical Dawn',
        '#191970',
        'First light of dawn'
      );
    }

    if (tomorrow.nauticalTwilightBegin && tomorrow.civilTwilightBegin) {
      addPhaseIfVisible(
        createDate(tomorrow.date, tomorrow.nauticalTwilightBegin),
        createDate(tomorrow.date, tomorrow.civilTwilightBegin),
        'Nautical Dawn',
        '#4169E1',
        'Early morning twilight'
      );
    }

    if (tomorrow.civilTwilightBegin && tomorrow.sunrise) {
      addPhaseIfVisible(
        createDate(tomorrow.date, tomorrow.civilTwilightBegin),
        createDate(tomorrow.date, tomorrow.sunrise),
        'Civil Dawn',
        '#FFA500',
        'Golden hour before sunrise'
      );
    }

    const sortedPhases = phases.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    return sortedPhases;
  }, [data, Math.floor(Date.now() / (60 * 1000))]); // Recalculate every minute to update the 8-hour window

  // Generate chart data from phases - memoized to prevent recalculation
  const chartData = useMemo(() => {
    if (phases.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [100],
          backgroundColor: ['#666'],
          borderColor: ['#333'],
          borderWidth: 1
        }]
      };
    }

    const labels = phases.map((phase: TimePhase) => phase.name);
    const data = phases.map((phase: TimePhase) => {
      const duration = (phase.end.getTime() - phase.start.getTime()) / (1000 * 60); // minutes
      return duration;
    });
    const backgroundColor = phases.map((phase: TimePhase) => phase.color);

    return {
      labels,
      datasets: [{
        data,
        backgroundColor,
        borderColor: backgroundColor.map((color: string) => color),
        borderWidth: 2,
        hoverBorderWidth: 3
      }]
    };
  }, [phases]);

  // Generate chart options with tooltips disabled (using Radix HoverCard instead)
  const getChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    circumference: 180, // Half doughnut
    rotation: 270, // Start from top
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false // Disabled - using Radix HoverCard instead
      }
    },
    interaction: {
      intersect: false,
      mode: 'nearest' as const
    },
    onHover: undefined, // Disable hover effects
    events: [] // Disable all chart events
  });

  if (loading) {
    return (
      <Card className="time-astronomical-widget" style={{ minHeight: '400px' }}>
        {!hideHeader && (
          <Flex align="center" gap="2" className="mb-3">
            <ClockIcon />
            <Text size="3" weight="medium">Time & Astronomy</Text>
            <ReloadIcon className="animate-spin ml-auto" />
          </Flex>
        )}
        <Flex align="center" justify="center" style={{ height: '300px' }}>
          <Text color="gray">Loading astronomical data...</Text>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="time-astronomical-widget" style={{ minHeight: '400px' }}>
        {!hideHeader && (
          <Flex align="center" gap="2" className="mb-3">
            <ExclamationTriangleIcon color="red" />
            <Text size="3" weight="medium">Time & Astronomy</Text>
          </Flex>
        )}
        <Flex direction="column" align="center" justify="center" gap="3" style={{ height: '300px' }}>
          <Text color="red" size="2">{error}</Text>
          <button onClick={() => fetchData()}>Retry</button>
        </Flex>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="time-astronomical-widget-v2" style={{ minHeight: '400px' }}>
      {!hideHeader && (
        <Flex align="center" gap="2" className="mb-3">
          <ClockIcon />
          <Text size="3" weight="medium">Time & Astronomy v2.0</Text>
          {onRefresh && (
            <button onClick={() => { fetchData(); onRefresh?.(); }} className="ml-auto">
              <ReloadIcon />
            </button>
          )}
        </Flex>
      )}

      <Flex direction="column" gap="4">
        {/* Current Time Display */}
        <Box style={{ textAlign: 'center' }}>
          <Text size="6" weight="bold" className="font-mono">
            {formatTime12Hour(currentTime)}
          </Text>
          <Text size="2" color="gray" style={{ display: 'block' }}>
            Current local time
          </Text>
        </Box>

        {/* 8-Hour Phase Chart with Radix HoverCards */}
        <Box style={{ height: '200px', position: 'relative' }}>
          {/* Chart */}
          <div style={{ height: '100%' }}>
            <Doughnut data={chartData} options={getChartOptions()} />
          </div>
          
          {/* Improved overlay areas with slight overlap for better hover detection */}
          {phases.map((phase, index) => {
            // Calculate the total duration for proportional width
            const totalDuration = phases.reduce((sum, p) => sum + (p.end.getTime() - p.start.getTime()), 0);
            if (totalDuration === 0) return null;
            
            // Calculate this phase's width as percentage of total
            const phaseDuration = phase.end.getTime() - phase.start.getTime();
            const basePhaseWidth = (phaseDuration / totalDuration) * 100;
            
            // Calculate cumulative position (left offset)
            const baseLeftOffset = phases.slice(0, index).reduce((sum, p) => {
              const prevDuration = p.end.getTime() - p.start.getTime();
              return sum + (prevDuration / totalDuration) * 100;
            }, 0);
            
            // Add small overlaps to prevent gaps (except for first and last)
            const overlapAmount = 2; // 2% overlap on each side
            let leftOffset = baseLeftOffset;
            let phaseWidth = basePhaseWidth;
            
            // Extend left boundary (except for first phase)
            if (index > 0) {
              leftOffset = Math.max(0, baseLeftOffset - overlapAmount);
              phaseWidth = basePhaseWidth + overlapAmount;
            }
            
            // Extend right boundary (except for last phase)
            if (index < phases.length - 1) {
              phaseWidth = phaseWidth + overlapAmount;
            }
            
            // Ensure we don't exceed 100% width
            phaseWidth = Math.min(phaseWidth, 100 - leftOffset);
            
            return (
              <HoverCard.Root key={`phase-overlay-${index}`}>
                <HoverCard.Trigger>
                  <div
                    style={{
                      position: 'absolute',
                      top: '0px',
                      left: `${leftOffset}%`,
                      width: `${phaseWidth}%`,
                      height: '100%', // Cover full height of chart area
                      cursor: 'pointer',
                      zIndex: 10,
                      backgroundColor: 'rgba(255, 255, 255, 0.01)', // Almost invisible but interactive
                      // Debug mode: uncomment next line to see hover zones
                      // border: `2px dashed ${phase.color}`,
                    }}
                    title={`${phase.name} hover zone`} // Tooltip for debugging
                  />
                </HoverCard.Trigger>
                <HoverCard.Content side="top" align="center">
                  <Flex direction="column" gap="2" style={{ minWidth: '200px' }}>
                    <Text size="3" weight="bold">{phase.name}</Text>
                    <Text size="2" color="gray">{phase.description}</Text>
                    <div>
                      <Text size="2">
                        <strong>Starts:</strong> {phase.realStart.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit', 
                          hour12: true 
                        })}
                      </Text>
                    </div>
                    <div>
                      <Text size="2">
                        <strong>Ends:</strong> {phase.realEnd.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit', 
                          hour12: true 
                        })}
                      </Text>
                    </div>
                  </Flex>
                </HoverCard.Content>
              </HoverCard.Root>
            );
          })}
          
          {/* Time range labels */}
          <Box style={{ 
            position: 'absolute', 
            bottom: '5px', 
            left: '5px'
          }}>
            <Text size="1" color="gray">-4hr</Text>
          </Box>
          <Box style={{ 
            position: 'absolute', 
            bottom: '5px', 
            right: '5px'
          }}>
            <Text size="1" color="gray">+4hr</Text>
          </Box>
        </Box>

        {/* Sunrise & Sunset Cards */}
        <Flex gap="3">
          <Card variant="surface" style={{ backgroundColor: 'var(--gray-2)', flex: 1 }}>
            <Flex align="center" gap="2">
              <WiSunrise size={24} color="var(--amber-9)" />
              <Flex direction="column">
                <Text size="1" color="gray">Sunrise</Text>
                <HoverCard.Root>
                  <HoverCard.Trigger>
                    <Text size="2" weight="medium" style={{ cursor: 'pointer' }}>
                      {formatTimeShort12Hour(data.astronomical.sunrise)}
                    </Text>
                  </HoverCard.Trigger>
                  <HoverCard.Content>
                    <Text size="1">
                      Civil dawn begins at {formatTimeShort12Hour(data.astronomical.civilTwilightBegin)}
                    </Text>
                  </HoverCard.Content>
                </HoverCard.Root>
              </Flex>
            </Flex>
          </Card>
          
          <Card variant="surface" style={{ backgroundColor: 'var(--gray-2)', flex: 1 }}>
            <Flex align="center" gap="2">
              <WiSunset size={24} color="var(--amber-9)" />
              <Flex direction="column">
                <Text size="1" color="gray">Sunset</Text>
                <HoverCard.Root>
                  <HoverCard.Trigger>
                    <Text size="2" weight="medium" style={{ cursor: 'pointer' }}>
                      {formatTimeShort12Hour(data.astronomical.sunset)}
                    </Text>
                  </HoverCard.Trigger>
                  <HoverCard.Content>
                    <Text size="1">
                      Civil dusk ends at {formatTimeShort12Hour(data.astronomical.civilTwilightEnd)}
                    </Text>
                  </HoverCard.Content>
                </HoverCard.Root>
              </Flex>
            </Flex>
          </Card>
        </Flex>

        {/* Moon Phase & Current Phase */}
        <Flex direction="column" gap="2">
          <Flex align="center" justify="between">
            <Flex align="center" gap="2">
              {getMoonIcon(data.astronomical.moonPhase.phase)}
              <Text size="2">Moon Phase</Text>
            </Flex>
            <HoverCard.Root>
              <HoverCard.Trigger>
                <Badge variant="soft" color="amber">
                  {Math.round(data.astronomical.moonPhase.illumination)}%
                </Badge>
              </HoverCard.Trigger>
              <HoverCard.Content>
                <Text size="1">
                  {data.astronomical.moonPhase.phase.replace('_', ' ')} moon
                  <br />
                  {Math.round(data.astronomical.moonPhase.illumination)}% illuminated
                </Text>
              </HoverCard.Content>
            </HoverCard.Root>
          </Flex>

          {/* Current Phase */}
          <Flex align="center" justify="between">
            <Text size="2">Current Phase</Text>
            <Badge 
              variant="soft" 
              style={{
                backgroundColor: 
                  data.astronomical.currentPhase === 'daylight' ? '#FFD70033' :
                  data.astronomical.currentPhase === 'civil' ? '#FFA50033' :
                  data.astronomical.currentPhase === 'nautical' ? '#4169E133' :
                  data.astronomical.currentPhase === 'astronomical' ? '#19197033' : 
                  data.astronomical.currentPhase === 'night' ? '#00008033' : '#66666633',
                color:
                  data.astronomical.currentPhase === 'daylight' ? '#B8860B' :
                  data.astronomical.currentPhase === 'civil' ? '#FF8C00' :
                  data.astronomical.currentPhase === 'nautical' ? '#1E90FF' :
                  data.astronomical.currentPhase === 'astronomical' ? '#4B0082' : 
                  data.astronomical.currentPhase === 'night' ? '#4682B4' : '#666666'
              }}
            >
              {data.astronomical.currentPhase === 'astronomical' ? 'astro twilight' : data.astronomical.currentPhase}
            </Badge>
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
};

export default TimeAstronomicalWidget;

