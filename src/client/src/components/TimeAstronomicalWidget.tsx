/**
 * TimeAstronomicalWidget - Streamlined modular version with SVG timeline
 * Refactored to stay under 500 LOC by extracting services and utilities
 * v3.0 - Now uses simple SVG timeline instead of problematic Chart.js pie chart
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Flex, Text, Badge, HoverCard, Box, Spinner, Callout } from '@radix-ui/themes';
import { 
  ClockIcon,
  ReloadIcon,
  ExclamationTriangleIcon
} from '@radix-ui/react-icons';
import { WiSunrise, WiSunset } from 'weather-icons-react';
import type { 
  TimeAstronomicalData, 
  TimeAstronomicalWidgetProps 
} from '../interfaces/system';
import { 
  astronomicalService,
  phaseCalculator,
  TimelineRenderer,
  getMoonIcon,
  getMoonPhaseDescription
} from '../services/astronomical';

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
      const result = await astronomicalService.fetchData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch astronomical data');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Real-time clock update every second using server time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(astronomicalService.getServerTime());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [data]); // Re-sync when data updates

  // Auto-refresh data every 30 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchData();
    }, 30 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Calculate phases for 8-hour window - memoized to prevent excessive recalculation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const phases = useMemo(() => {
    if (!data) return [];
    return phaseCalculator.calculatePhases(data, currentTime);
  }, [data, currentTime, Math.floor(Date.now() / (60 * 1000))]); // Recalculate every minute

  // Loading state
  if (loading) {
    return (
      <Card className="time-astronomical-widget" style={{ minHeight: '400px' }}>
        {!hideHeader && (
          <Flex align="center" gap="2" className="mb-3">
            <ClockIcon />
            <Text size="3" weight="medium">Time & Astronomy</Text>
            <Spinner className="ml-auto" />
          </Flex>
        )}
        <Flex align="center" justify="center" style={{ height: '300px' }}>
          <Text color="gray">Loading astronomical data...</Text>
        </Flex>
      </Card>
    );
  }

  // Error state
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
          <Callout.Root color="red" size="1">
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
          <button onClick={() => fetchData()}>Retry</button>
        </Flex>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="time-astronomical-widget-v3" style={{ minHeight: '400px' }}>
      {!hideHeader && (
        <Flex align="center" gap="2" className="mb-3">
          <ClockIcon />
          <Text size="3" weight="medium">Time & Astronomy v3.0</Text>
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
          <HoverCard.Root>
            <HoverCard.Trigger>
              <Text size="6" weight="bold" className="font-mono" style={{ cursor: 'help' }}>
                {astronomicalService.formatTime12Hour(currentTime)}
              </Text>
            </HoverCard.Trigger>
            <HoverCard.Content size="1">
              <Flex direction="column" gap="1">
                <Text size="2" weight="bold">Time Information</Text>
                <Text size="1">Server time: {astronomicalService.formatTime12Hour(currentTime)}</Text>
                <Text size="1">Browser time: {astronomicalService.formatTime12Hour(new Date())}</Text>
                {astronomicalService.isDifferent() && (
                  <Text size="1" color="amber">
                    ⚠️ Times differ by {Math.round(astronomicalService.getServerTimeOffset() / 1000)}s
                  </Text>
                )}
              </Flex>
            </HoverCard.Content>
          </HoverCard.Root>
          <Text size="2" color="gray" style={{ display: 'block' }}>
            Server time (hover for details)
          </Text>
        </Box>

        {/* SVG Timeline - replaces the problematic Chart.js pie chart */}
        <TimelineRenderer 
          phases={phases}
          currentTime={currentTime}
          formatTime12Hour={astronomicalService.formatTime12Hour}
        />

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
                      {astronomicalService.formatTimeShort12Hour(data.astronomical.sunrise)}
                    </Text>
                  </HoverCard.Trigger>
                  <HoverCard.Content>
                    <Text size="1">
                      Civil dawn begins at {astronomicalService.formatTimeShort12Hour(data.astronomical.civilTwilightBegin)}
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
                      {astronomicalService.formatTimeShort12Hour(data.astronomical.sunset)}
                    </Text>
                  </HoverCard.Trigger>
                  <HoverCard.Content>
                    <Text size="1">
                      Civil dusk ends at {astronomicalService.formatTimeShort12Hour(data.astronomical.civilTwilightEnd)}
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
                  {getMoonPhaseDescription(data.astronomical.moonPhase.phase, data.astronomical.moonPhase.illumination)}
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
