import React, { useState, useEffect, useCallback } from 'react';
import { Card, Flex, Box, Text, Badge, Progress, Button, HoverCard, Separator, Heading } from '@radix-ui/themes';
import { 
  TargetIcon, 
  ReloadIcon, 
  ExclamationTriangleIcon,
  CheckCircledIcon,
  DotFilledIcon,
  ImageIcon,
  ClockIcon
} from '@radix-ui/react-icons';
import { useUnifiedWebSocket } from '../hooks/useUnifiedWebSocket';
import { getApiUrl } from '../config/api';
import type { TargetSchedulerProps } from '../interfaces/dashboard';

export const TargetSchedulerWidget: React.FC<TargetSchedulerProps> = ({ onRefresh, hideHeader = false }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastImageSave, setLastImageSave] = useState<string>('');
  const [lastApiCall, setLastApiCall] = useState<number>(0);

  // Use unified WebSocket for NINA events
  const { 
    connected: wsConnected, 
    onNINAEvent,
    lastEvent 
  } = useUnifiedWebSocket({
    widgetType: 'target_scheduler',
    eventTypes: ['IMAGE-SAVE', 'SEQUENCE-FINISHED']
  });

  // Bootstrap pattern: Session state management
  const [sessionData, setSessionData] = useState<any>(null);

  const fetchData = useCallback(async (reason = 'manual') => {
    // Throttle API calls - minimum 3 seconds between calls
    const now = Date.now();
    if (now - lastApiCall < 3000 && reason !== 'manual') {
      console.log('📊 Scheduler API call throttled (< 3s since last call)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLastApiCall(now);
      
      console.log(`📊 Scheduler API call: ${reason}`);
      const response = await fetch(getApiUrl('scheduler/progress'));
      if (!response.ok) throw new Error('Failed to fetch');
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API Error');
    } finally {
      setLoading(false);
    }
  }, [lastApiCall]);

  // Handle unified session updates (moved after fetchData declaration)
  const handleUnifiedSessionUpdate = useCallback((session: any) => {
    setSessionData(session);
    
    // Only update scheduler if target changed (affects "Shooting Now" badge)
    const newTarget = session?.target?.name;
    const currentTarget = data?.find((p: any) => p.isCurrentlyActive)?.targets?.[0]?.name;
    
    if (newTarget !== currentTarget) {
      console.log('📊 Target changed, updating "Shooting Now" badge:', newTarget);
      fetchData('target-changed');
    }
  }, [data, fetchData]);

  // Enhanced WebSocket event handler - only for IMAGE-SAVE events
  const handleWidgetEvent = useCallback((event: any) => {
    console.log('📊 Scheduler widget event received:', event.Type, event.Data?.ImageStatistics?.ImageType);
    
    // Only process IMAGE-SAVE events with ImageStatistics (light frames)
    if (event.Type === 'IMAGE-SAVE' && event.Data?.ImageStatistics) {
      const imageStats = event.Data.ImageStatistics;
      
      // Skip calibration frames (darks, flats, bias)
      if (imageStats.ImageType && imageStats.ImageType !== 'LIGHT') {
        console.log('📊 Ignoring calibration frame:', imageStats.ImageType);
        return;
      }
      
      console.log('✅ Processing light frame for scheduler progress update');
      setLastImageSave(event.Timestamp);
      fetchData('light-frame-captured');
    } else if (event.Type === 'SEQUENCE-FINISHED') {
      console.log('📊 Sequence finished, updating scheduler progress');
      fetchData('sequence-finished');
    }
  }, [fetchData]);

  // Subscribe to unified WebSocket events
  useEffect(() => {
    // Subscribe to NINA events (IMAGE-SAVE, SEQUENCE-FINISHED)
    const unsubscribeNINA = onNINAEvent(handleWidgetEvent);
    
    // Subscribe to session updates using unified WebSocket service directly
    const { unifiedWebSocket } = require('../services/unifiedWebSocket');
    const handleSessionEvent = (sessionData: any) => {
      handleUnifiedSessionUpdate(sessionData);
    };
    
    unifiedWebSocket.on('session:update', handleSessionEvent);
    
    return () => {
      unsubscribeNINA();
      unifiedWebSocket.off('session:update', handleSessionEvent);
    };
  }, [onNINAEvent, handleWidgetEvent, handleUnifiedSessionUpdate]);

  // Initial data load
  useEffect(() => {
    fetchData('initial-load');
  }, [fetchData]);

  if (loading) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          {!hideHeader && (
            <Flex align="center" gap="2">
              <TargetIcon />
              <Text size="3" weight="medium">Target Scheduler</Text>
            </Flex>
          )}
          <Flex align="center" justify="center" style={{ minHeight: hideHeader ? '150px' : '200px' }}>
            <Flex direction="column" align="center" gap="2">
              <ReloadIcon className="loading-spinner" />
              <Text size="2" color="gray">Loading projects...</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          {!hideHeader && (
            <Flex align="center" gap="2">
              <TargetIcon />
              <Text size="3" weight="medium">Target Scheduler</Text>
            </Flex>
          )}
          <Flex align="center" justify="center" style={{ minHeight: hideHeader ? '150px' : '200px' }}>
            <Flex direction="column" align="center" gap="2">
              <ExclamationTriangleIcon color="red" width="24" height="24" />
              <Text size="2" color="red">Failed to load data</Text>
              <Text size="1" color="gray">{error}</Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        {!hideHeader && (
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <TargetIcon />
              <Text size="3" weight="medium">Target Scheduler</Text>
              {lastImageSave && (
                <Badge variant="soft" color="green" size="1">
                  Live Updates
                </Badge>
              )}
            </Flex>
            <Badge color="green" size="2">
              <CheckCircledIcon width="12" height="12" />
              {data?.activeProjects || 0} Projects
            </Badge>
          </Flex>
        )}

        {/* Status badge for grid layout */}
        {hideHeader && (
          <Flex justify="center">
            <Badge color="green" size="2">
              <CheckCircledIcon width="12" height="12" />
              {data?.activeProjects || 0} Projects
            </Badge>
          </Flex>
        )}

        <Flex direction="column" gap="3">
          {data?.projects?.map((project: any) => (
            <Card key={project.id} variant="surface">
              <Box p="3">
                <Flex justify="between" align="center" mb="2">
                  <Flex align="center" gap="2">
                    <HoverCard.Root>
                      <HoverCard.Trigger>
                        <Text weight="bold" size="3" style={{ cursor: 'pointer' }}>
                          {project.name}
                        </Text>
                      </HoverCard.Trigger>
                      <HoverCard.Content size="3" style={{ maxWidth: '500px', width: '500px' }}>
                        <Flex direction="column" gap="2">
                          <Heading size="3">{project.name}</Heading>
                          {project.description && (
                            <Text size="2" color="gray">{project.description}</Text>
                          )}
                          <Separator />
                          <Heading size="2">Filter Details</Heading>
                          {project.targets?.[0]?.filters?.map((filter: any) => {
                            const integrationMinutes = Math.round((filter.acceptedIntegrationTime || 0) / 60);
                            const desiredMinutes = Math.round((filter.desiredIntegrationTime || 0) / 60);
                            const remainingMinutes = Math.round((filter.remainingIntegrationTime || 0) / 60);
                            
                            // Helper function to format time
                            const formatTime = (minutes: number) => {
                              if (minutes >= 60) {
                                const hours = Math.floor(minutes / 60);
                                const remainingMins = minutes % 60;
                                return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
                              }
                              return `${minutes}m`;
                            };
                            
                            return (
                              <Box key={filter.filtername}>
                                <Flex justify="between" align="center" mb="1">
                                  <Text weight="medium" size="2">{filter.filtername}</Text>
                                  <Badge variant="soft" color={
                                    filter.completion >= 100 ? 'green' : 
                                    filter.completion >= 50 ? 'amber' : 'red'
                                }>
                                  {filter.completion}%
                                </Badge>
                              </Flex>
                              <Flex direction="column" gap="1">
                                <Flex justify="between">
                                  <Text size="1" color="gray">Images:</Text>
                                  <Text size="1">{filter.accepted}/{filter.desired} ({filter.remainingImages} left)</Text>
                                </Flex>
                                <Flex justify="between">
                                  <Text size="1" color="gray">Integration:</Text>
                                  <Text size="1">
                                    {formatTime(integrationMinutes)} / {formatTime(desiredMinutes)}
                                    {remainingMinutes > 0 && (
                                      <span style={{ color: 'var(--amber-9)' }}> ({formatTime(remainingMinutes)} left)</span>
                                    )}
                                  </Text>
                                </Flex>
                                <Flex justify="between">
                                  <Text size="1" color="gray">Exposure:</Text>
                                  <Text size="1">{filter.exposureTime}s</Text>
                                </Flex>
                              </Flex>
                              <Progress 
                                value={filter.completion} 
                                size="1"
                                color={filter.completion >= 100 ? 'green' : filter.completion >= 50 ? 'amber' : 'red'}
                                style={{ marginTop: '4px' }}
                              />
                            </Box>
                          );
                        }) || <Text size="1" color="gray">No filter data available</Text>}
                      </Flex>
                    </HoverCard.Content>
                  </HoverCard.Root>
                    {project.isCurrentlyActive && (
                      <Badge variant="solid" color="green">
                        <DotFilledIcon width="12" height="12" />
                        Shooting Now
                      </Badge>
                    )}
                  </Flex>
                  <Badge 
                    variant="soft" 
                    color={project.priority === 2 ? 'red' : project.priority === 1 ? 'amber' : 'gray'}
                  >
                    {project.priority === 2 ? 'High' : project.priority === 1 ? 'Normal' : 'Low'}
                  </Badge>
                </Flex>
                
                <Flex justify="between" align="center" mb="2">
                  <Flex align="center" gap="2">
                    <ImageIcon width="14" height="14" />
                    <Text size="2" color="gray">
                      {project.targets?.[0]?.filters?.reduce((sum: number, f: any) => sum + (f.accepted || 0), 0) || 0} images graded
                      {project.targets?.[0]?.filters && project.targets[0].filters.length > 0 && (() => {
                        const totalIntegrationMinutes = Math.round(
                          project.targets[0].filters.reduce((sum: number, f: any) => sum + (f.acceptedIntegrationTime || 0), 0) / 60
                        );
                        return totalIntegrationMinutes > 0 ? ` • ${totalIntegrationMinutes}m total` : '';
                      })()}
                    </Text>
                  </Flex>
                  <Text size="2" weight="bold" color={
                    (() => {
                      const actualCompletion = project.targets?.[0]?.filters ? 
                        project.targets[0].filters.reduce((sum: number, f: any) => sum + (f.completion || 0), 0) / project.targets[0].filters.length : 0;
                      return actualCompletion > 50 ? 'green' : 'amber';
                    })()
                  }>
                    <HoverCard.Root>
                      <HoverCard.Trigger>
                        <span style={{ cursor: 'pointer' }}>
                          {(() => {
                            const actualCompletion = project.targets?.[0]?.filters ? 
                              project.targets[0].filters.reduce((sum: number, f: any) => sum + (f.completion || 0), 0) / project.targets[0].filters.length : 0;
                            return actualCompletion.toFixed(1);
                          })()}% complete
                        </span>
                      </HoverCard.Trigger>
                      <HoverCard.Content size="2" style={{ width: '320px', maxWidth: '320px' }}>
                        <Flex direction="column" gap="2">
                          <Heading size="2">Project Progress</Heading>
                          <Separator />
                          {(() => {
                            const totalDesired = project.targets?.[0]?.filters?.reduce((sum: number, f: any) => sum + (f.desired || 0), 0) || 0;
                            const totalAcquired = project.targets?.[0]?.filters?.reduce((sum: number, f: any) => sum + (f.acquired || 0), 0) || 0;
                            const totalAccepted = project.targets?.[0]?.filters?.reduce((sum: number, f: any) => sum + (f.accepted || 0), 0) || 0;
                            const totalDesiredIntegration = project.targets?.[0]?.filters?.reduce((sum: number, f: any) => sum + (f.desiredIntegrationTime || 0), 0) || 0;
                            const totalAcceptedIntegration = project.targets?.[0]?.filters?.reduce((sum: number, f: any) => sum + (f.acceptedIntegrationTime || 0), 0) || 0;
                            const remainingImages = Math.max(0, totalDesired - totalAccepted);
                            const remainingIntegration = Math.max(0, totalDesiredIntegration - totalAcceptedIntegration);
                            
                            // Time formatting helper
                            const formatTime = (seconds: number) => {
                              const minutes = Math.round(seconds / 60);
                              if (minutes >= 60) {
                                const hours = Math.floor(minutes / 60);
                                const remainingMins = minutes % 60;
                                return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
                              }
                              return `${minutes}m`;
                            };
                            
                            return (
                              <>
                                <Flex justify="between">
                                  <Text size="1" color="gray">Images Desired:</Text>
                                  <Text size="1" weight="medium">{totalDesired}</Text>
                                </Flex>
                                <Flex justify="between">
                                  <Text size="1" color="gray">Images Acquired:</Text>
                                  <Text size="1" weight="medium">{totalAcquired}</Text>
                                </Flex>
                                <Flex justify="between">
                                  <Text size="1" color="gray">Images Accepted:</Text>
                                  <Text size="1" weight="medium" color={totalAccepted > 0 ? 'green' : 'gray'}>{totalAccepted}</Text>
                                </Flex>
                                <Flex justify="between">
                                  <Text size="1" color="gray">Remaining Images:</Text>
                                  <Text size="1" weight="medium" color={remainingImages > 0 ? 'amber' : 'green'}>{remainingImages}</Text>
                                </Flex>
                                <Separator />
                                <Flex justify="between">
                                  <Text size="1" color="gray">Integration Planned:</Text>
                                  <Text size="1" weight="medium">{formatTime(totalDesiredIntegration)}</Text>
                                </Flex>
                                <Flex justify="between">
                                  <Text size="1" color="gray">Integration Complete:</Text>
                                  <Text size="1" weight="medium" color={totalAcceptedIntegration > 0 ? 'green' : 'gray'}>{formatTime(totalAcceptedIntegration)}</Text>
                                </Flex>
                                <Flex justify="between">
                                  <Text size="1" color="gray">Integration Remaining:</Text>
                                  <Text size="1" weight="medium" color={remainingIntegration > 0 ? 'amber' : 'green'}>{formatTime(remainingIntegration)}</Text>
                                </Flex>
                              </>
                            );
                          })()}
                        </Flex>
                      </HoverCard.Content>
                    </HoverCard.Root>
                  </Text>
                </Flex>
                
                <Progress 
                  value={(() => {
                    const actualCompletion = project.targets?.[0]?.filters ? 
                      project.targets[0].filters.reduce((sum: number, f: any) => sum + (f.completion || 0), 0) / project.targets[0].filters.length : 0;
                    return actualCompletion;
                  })()} 
                  color={(() => {
                    const actualCompletion = project.targets?.[0]?.filters ? 
                      project.targets[0].filters.reduce((sum: number, f: any) => sum + (f.completion || 0), 0) / project.targets[0].filters.length : 0;
                    return actualCompletion > 50 ? 'green' : 'amber';
                  })()}
                />
              </Box>
            </Card>
          )) || <Text size="2" color="gray">No projects found</Text>}
        </Flex>

      </Flex>
    </Card>
  );
};

export default TargetSchedulerWidget;

