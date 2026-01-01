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

  // Filter color coding (same as ImageStats)
  const getFilterColor = (filter: string): 'blue' | 'red' | 'green' | 'yellow' => {
    // Type guard for runtime safety
    if (!filter || typeof filter !== 'string') return 'yellow';
    
    const filterLower = filter.toLowerCase();
    if (filterLower.includes('blue') || filterLower.includes('oiii')) return 'blue';
    if (filterLower.includes('red') || filterLower.includes('ha')) return 'red';
    if (filterLower.includes('green') || filterLower.includes('sii')) return 'green';
    return 'yellow';
  };

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
  
  // Check if session is truly active (has a target and recent activity)
  const isSessionActive = session?.isActive === true && session?.target?.targetName != null;
  
  // Check if guiding is actually active (based on guiding state)
  const isGuidingActive = session?.guiding?.isGuiding === true;

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
                      <Badge color={isSessionActive ? 'green' : 'gray'} variant="soft">
                        {isSessionActive ? 'Yes' : 'No'}
                      </Badge>
                    </Flex>
                    
                    {session.guiding && (
                      <Flex direction="column" gap="1">
                        <Text size="1" color="gray">Guiding</Text>
                        <Badge color={isGuidingActive ? 'blue' : 'gray'} variant="soft">
                          {isGuidingActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Flex>
                    )}
                  </Grid>

                  {/* Only show Target and Imaging when session is active */}
                  {isSessionActive && (
                    <>
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
                                RA: {typeof session.target.ra === 'number' ? session.target.ra.toFixed(2) : 'N/A'}h
                              </Text>
                              <Text size="1" color="gray">
                                Dec: {typeof session.target.dec === 'number' ? session.target.dec.toFixed(2) : 'N/A'}°
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
                      {session.imaging && session.imaging.lastImage && (
                        <>
                          <Separator size="2" />
                          <Flex direction="column" gap="2">
                            <Text size="1" color="gray" weight="bold">Imaging</Text>
                            <Grid columns="2" gap="2">
                              {currentFilter && currentFilter !== 'Unknown' && (
                                <Flex direction="column" gap="1">
                                  <Text size="1" color="gray">Filter</Text>
                                  <Badge color={getFilterColor(currentFilter)} variant="soft">{currentFilter}</Badge>
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
                                    HFR: {typeof session.imaging.lastImage.hfr === 'number' ? session.imaging.lastImage.hfr.toFixed(2) : 'N/A'}"
                                  </Text>
                                )}
                              </Flex>
                            )}
                          </Flex>
                        </>
                      )}

                      {/* Guiding Details */}
                      {isGuidingActive && session.guiding.lastRmsTotal !== null && (
                        <>
                          <Separator size="2" />
                          <Flex direction="column" gap="1">
                            <Text size="1" color="gray" weight="bold">Guiding RMS</Text>
                            <Grid columns="3" gap="2">
                              <Flex direction="column">
                                <Text size="1" color="gray">Total</Text>
                                <Text size="2" weight="medium">
                                  {typeof session.guiding.lastRmsTotal === 'number' ? session.guiding.lastRmsTotal.toFixed(2) : '0.00'}"
                                </Text>
                              </Flex>
                              {session.guiding.lastRmsRa !== null && (
                                <Flex direction="column">
                                  <Text size="1" color="gray">RA</Text>
                                  <Text size="2">{typeof session.guiding.lastRmsRa === 'number' ? session.guiding.lastRmsRa.toFixed(2) : '0.00'}"</Text>
                                </Flex>
                              )}
                              {session.guiding.lastRmsDec !== null && (
                                <Flex direction="column">
                                  <Text size="1" color="gray">Dec</Text>
                                  <Text size="2">{typeof session.guiding.lastRmsDec === 'number' ? session.guiding.lastRmsDec.toFixed(2) : '0.00'}"</Text>
                                </Flex>
                              )}
                            </Grid>
                          </Flex>
                        </>
                      )}
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
