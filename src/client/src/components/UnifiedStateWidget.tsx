// UnifiedState Widget - Real-time observatory state monitoring
// Displays live session information and recent events

import React from 'react';
import { Card, Flex, Text, Badge, Separator, Grid } from '@radix-ui/themes';
import { 
  DotFilledIcon, 
  Component1Icon,
  RocketIcon,
  TargetIcon,
  ClockIcon
} from '@radix-ui/react-icons';
import { useUnifiedState } from '../contexts/UnifiedStateContext';

const UnifiedStateWidget: React.FC = () => {
  const { state, loading, error, connected, lastUpdate } = useUnifiedState();

  if (loading) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex align="center" gap="2">
            <Component1Icon />
            <Text size="3" weight="medium">Unified State</Text>
          </Flex>
          <Text size="2" color="gray">Loading unified state...</Text>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Flex align="center" gap="2">
            <Component1Icon />
            <Text size="3" weight="medium">Unified State</Text>
          </Flex>
          <Text size="2" color="red">{error}</Text>
        </Flex>
      </Card>
    );
  }

  const session = state?.currentSession;
  const filterWheel = state?.equipment.find(e => e.type === 'filterWheel');
  const currentFilter = session?.imaging?.currentFilter || filterWheel?.details?.New?.Name || 'Unknown';

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        {/* Header */}
        <Flex justify="between" align="center">
          <Flex align="center" gap="2">
            <Component1Icon />
            <Text size="3" weight="medium">Unified State</Text>
          </Flex>
          <Badge color={connected ? 'green' : 'red'} size="2">
            <DotFilledIcon width="12" height="12" />
            {connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </Flex>

        <Flex direction="column" gap="4">
          {/* Session Status */}
            {session && (
              <>
                <Flex direction="column" gap="2">
                  <Flex align="center" gap="2">
                    <RocketIcon />
                    <Text size="2" weight="bold">Session Status</Text>
                  </Flex>
                  
                  <Grid columns="2" gap="2">
                    <Flex direction="column" gap="1">
                      <Text size="1" color="gray">Active</Text>
                      <Badge color={session.isActive ? 'green' : 'gray'} variant="soft">
                        {session.isActive ? 'Yes' : 'No'}
                      </Badge>
                    </Flex>
                    
                    {session.guiding && (
                      <Flex direction="column" gap="1">
                        <Text size="1" color="gray">Guiding</Text>
                        <Badge color={session.guiding.isGuiding ? 'blue' : 'gray'} variant="soft">
                          {session.guiding.isGuiding ? 'Active' : 'Inactive'}
                        </Badge>
                      </Flex>
                    )}
                  </Grid>

                  {/* Target Information */}
                  {session.target?.targetName && (
                    <>
                      <Separator size="2" />
                      <Flex direction="column" gap="1">
                        <Text size="1" color="gray">Target</Text>
                        <Flex align="center" gap="1">
                          <TargetIcon width="14" height="14" />
                          <Text size="2" weight="medium">{session.target.targetName}</Text>
                        </Flex>
                        {session.target.projectName && session.target.projectName !== session.target.targetName && (
                          <Text size="1" color="gray">Project: {session.target.projectName}</Text>
                        )}
                        <Flex gap="3" mt="1">
                          <Text size="1" color="gray">
                            RA: {session.target.ra?.toFixed(2)}h
                          </Text>
                          <Text size="1" color="gray">
                            Dec: {session.target.dec?.toFixed(2)}°
                          </Text>
                          {session.target.rotation !== null && (
                            <Text size="1" color="gray">
                              Rot: {session.target.rotation}°
                            </Text>
                          )}
                        </Flex>
                      </Flex>
                    </>
                  )}

                  {/* Imaging Information */}
                  {session.imaging && (session.isActive || session.imaging.lastImage) && (
                    <>
                      <Separator size="2" />
                      <Flex direction="column" gap="2">
                        <Text size="1" color="gray" weight="bold">Imaging</Text>
                        <Grid columns="2" gap="2">
                          {currentFilter && currentFilter !== 'Unknown' && (
                            <Flex direction="column" gap="1">
                              <Text size="1" color="gray">Filter</Text>
                              <Badge color="blue" variant="soft">{currentFilter}</Badge>
                            </Flex>
                          )}
                          {session.imaging.exposureSeconds && (
                            <Flex direction="column" gap="1">
                              <Text size="1" color="gray">Exposure</Text>
                              <Text size="1">{session.imaging.exposureSeconds}s</Text>
                            </Flex>
                          )}
                          {session.imaging.frameType && (
                            <Flex direction="column" gap="1">
                              <Text size="1" color="gray">Frame Type</Text>
                              <Badge color={
                                session.imaging.frameType === 'LIGHT' ? 'green' :
                                session.imaging.frameType === 'DARK' ? 'gray' :
                                session.imaging.frameType === 'FLAT' ? 'orange' : 'blue'
                              } variant="soft">
                                {session.imaging.frameType}
                              </Badge>
                            </Flex>
                          )}
                        </Grid>
                        
                        {session.imaging.lastImage && (
                          <Flex direction="column" gap="1" mt="1">
                            <Text size="1" color="gray">Last Image</Text>
                            <Flex align="center" gap="1">
                              <ClockIcon width="12" height="12" />
                              <Text size="1">
                                {new Date(session.imaging.lastImage.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </Text>
                            </Flex>
                            {session.imaging.lastImage.stars !== null && (
                              <Text size="1" color="gray">
                                Stars: {session.imaging.lastImage.stars} | 
                                HFR: {session.imaging.lastImage.hfr?.toFixed(2)}"
                              </Text>
                            )}
                          </Flex>
                        )}
                      </Flex>
                    </>
                  )}

                  {/* Guiding Details */}
                  {session.guiding?.isGuiding && session.guiding.lastRmsTotal !== null && (
                    <>
                      <Separator size="2" />
                      <Flex direction="column" gap="1">
                        <Text size="1" color="gray" weight="bold">Guiding RMS</Text>
                        <Grid columns="3" gap="2">
                          <Flex direction="column">
                            <Text size="1" color="gray">Total</Text>
                            <Text size="2" weight="medium">
                              {session.guiding.lastRmsTotal?.toFixed(2)}"
                            </Text>
                          </Flex>
                          {session.guiding.lastRmsRa !== null && (
                            <Flex direction="column">
                              <Text size="1" color="gray">RA</Text>
                              <Text size="2">{session.guiding.lastRmsRa?.toFixed(2)}"</Text>
                            </Flex>
                          )}
                          {session.guiding.lastRmsDec !== null && (
                            <Flex direction="column">
                              <Text size="1" color="gray">Dec</Text>
                              <Text size="2">{session.guiding.lastRmsDec?.toFixed(2)}"</Text>
                            </Flex>
                          )}
                        </Grid>
                      </Flex>
                    </>
                  )}
                </Flex>

                <Separator size="4" />
              </>
            )}

            {/* Recent Events */}
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold" color="gray">
                Recent Events ({state?.recentEvents.length || 0})
              </Text>
              {state?.recentEvents && state.recentEvents.length > 0 ? (
                <Flex direction="column" gap="1">
                  {state.recentEvents.slice(0, 8).map((event, index) => {
                    // Format event summary with consistent capitalization
                    let summary = event.summary;
                    
                    // For target changed events, show the target name
                    if (event.type === 'SESSION' && event.meta?.TargetName) {
                      summary = `Target: ${event.meta.TargetName}`;
                    }
                    
                    // Capitalize first letter
                    summary = summary.charAt(0).toUpperCase() + summary.slice(1);
                    
                    // Format time without seconds
                    const timeFormat: Intl.DateTimeFormatOptions = {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    };
                    const formattedTime = new Date(event.time).toLocaleTimeString('en-US', timeFormat);
                    
                    return (
                      <Flex 
                        key={index} 
                        direction="column" 
                        gap="1" 
                        p="2"
                        style={{ 
                          background: 'var(--gray-3)', 
                          borderRadius: '4px',
                          borderLeft: `3px solid var(--${
                            event.type === 'SESSION' ? 'blue' :
                            event.type === 'GUIDING' ? 'green' :
                            event.type === 'IMAGE-SAVE' ? 'orange' :
                            event.type === 'STACK' ? 'purple' : 'gray'
                          }-9)`
                        }}
                      >
                        <Flex justify="between" align="center">
                          <Text size="1" weight="medium">{summary}</Text>
                          <Badge size="1" variant="soft" color={
                            event.type === 'SESSION' ? 'blue' :
                            event.type === 'GUIDING' ? 'green' :
                            event.type === 'IMAGE-SAVE' ? 'orange' :
                            event.type === 'STACK' ? 'purple' : 'gray'
                          }>
                            {event.type}
                          </Badge>
                        </Flex>
                        <Text size="1" color="gray">
                          {formattedTime}
                        </Text>
                      </Flex>
                    );
                  })}
                </Flex>
              ) : (
                <Text size="1" color="gray">No recent events</Text>
              )}
            </Flex>
        </Flex>
      </Flex>
    </Card>
  );
};

export default UnifiedStateWidget;
