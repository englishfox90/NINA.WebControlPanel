/**
 * Enhanced Session Widget
 * A specialized version with enhanced features enabled by default
 */

import React from 'react';
import SessionWidget from './index';
import type { SessionWidgetProps } from '../../interfaces/session';

const SessionWidgetEnhanced: React.FC<SessionWidgetProps> = (props) => {
  return (
    <SessionWidget 
      {...props}
      enableEnhancedMode={true}
      showSessionWindow={true}
      enableTimezoneFormatting={true}
    />
  );
};

export default SessionWidgetEnhanced;
