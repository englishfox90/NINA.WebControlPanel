/**
 * Modular Session Widget
 * A clean, modular implementation that combines all session widget functionality
 */

import React, { memo } from 'react';
import { Card, Flex } from '@radix-ui/themes';
import type { SessionWidgetProps } from '../../interfaces/session';

// Modular components
import { useSessionData } from './useSessionData';
import { SessionHeader } from './SessionHeader';
import { SessionTarget } from './SessionTarget';
import { SessionActivity } from './SessionActivity';
import { SessionStatus } from './SessionStatus';
import { SessionLoading, SessionError, SessionIdle } from './SessionStates';
import { getSessionStatus } from './utils';

const SessionWidget: React.FC<SessionWidgetProps> = memo(({
  enableEnhancedMode = false,
  showSessionWindow = true,
  enableTimezoneFormatting = true,
  hideHeader = false,
  onRefresh
}) => {
  // Use the modular data hook
  const {
    sessionData,
    loading,
    error,
    refreshing,
    wsConnected,
    refresh
  } = useSessionData(enableEnhancedMode);

  // Handle refresh with callback
  const handleRefresh = async () => {
    await refresh();
    onRefresh?.();
  };

  // Determine widget title
  const widgetTitle = enableEnhancedMode ? 'Enhanced Session' : 'Current Session';

  // Loading state
  if (loading) {
    return (
      <SessionLoading 
        hideHeader={hideHeader} 
        title={widgetTitle}
      />
    );
  }

  // Error state
  if (error) {
    return (
      <SessionError 
        error={error}
        hideHeader={hideHeader}
        title={widgetTitle}
        onRetry={handleRefresh}
        retrying={refreshing}
      />
    );
  }

  // Check session status
  const sessionStatus = getSessionStatus(sessionData);

  // Idle/No session state
  if (sessionStatus !== 'active') {
    return (
      <SessionIdle 
        hideHeader={hideHeader}
        title={widgetTitle}
        wsConnected={wsConnected}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
    );
  }

  // Active session state
  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        {/* Header */}
        <SessionHeader
          title={widgetTitle}
          wsConnected={wsConnected}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          hideHeader={hideHeader}
        />

        {/* Session Status and Window (Enhanced mode) */}
        <SessionStatus
          sessionData={sessionData}
          enableTimezoneFormatting={enableTimezoneFormatting}
          showSessionWindow={showSessionWindow}
        />

        {/* Current Target */}
        <SessionTarget sessionData={sessionData} />

        {/* Activity Information */}
        <SessionActivity 
          sessionData={sessionData}
          enableTimezoneFormatting={enableTimezoneFormatting}
        />
      </Flex>
    </Card>
  );
});

export default SessionWidget;
