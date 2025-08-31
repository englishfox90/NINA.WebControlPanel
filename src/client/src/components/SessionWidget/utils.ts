/**
 * Session Widget Utilities
 * Helper functions for formatting dates, durations, and data processing
 */

/**
 * Format timestamp for display
 */
export const formatTimestamp = (timestamp: string | null, enableTimezoneFormatting = true): string => {
  if (!timestamp) return 'Never';
  
  const date = new Date(timestamp);
  
  if (enableTimezoneFormatting) {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format duration between two timestamps
 */
export const formatDuration = (startTime: string | null, endTime?: string | null): string | null => {
  if (!startTime) return null;
  
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diffMs = end.getTime() - start.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

/**
 * Format duration for time since
 */
export const formatTimeSince = (timestamp: string | null): string | null => {
  if (!timestamp) return null;
  
  const start = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return `${seconds}s ago`;
  }
};

/**
 * Check if session data is enhanced mode
 */
export const isEnhancedSessionData = (data: any): boolean => {
  return data && typeof data === 'object' && 'session' in data;
};

/**
 * Check if session data is legacy mode
 */
export const isLegacySessionData = (data: any): boolean => {
  return data && typeof data === 'object' && 'isActive' in data;
};

/**
 * Get session activity status
 */
export const getSessionStatus = (sessionData: any): 'active' | 'idle' | 'unknown' => {
  if (!sessionData) return 'unknown';
  
  if (isEnhancedSessionData(sessionData)) {
    const enhanced = sessionData as any;
    return enhanced.session?.startedAt && !enhanced.session?.finishedAt ? 'active' : 'idle';
  }
  
  if (isLegacySessionData(sessionData)) {
    const legacy = sessionData as any;
    return legacy.isActive ? 'active' : 'idle';
  }
  
  return 'unknown';
};

/**
 * Extract target information from session data
 */
export const extractTargetInfo = (sessionData: any) => {
  if (!sessionData) return null;
  
  if (isEnhancedSessionData(sessionData)) {
    const enhanced = sessionData as any;
    return enhanced.target;
  }
  
  if (isLegacySessionData(sessionData)) {
    const legacy = sessionData as any;
    return legacy.target;
  }
  
  return null;
};

/**
 * Extract filter information from session data
 */
export const extractFilterInfo = (sessionData: any) => {
  if (!sessionData) return null;
  
  if (isEnhancedSessionData(sessionData)) {
    const enhanced = sessionData as any;
    return enhanced.filter;
  }
  
  if (isLegacySessionData(sessionData)) {
    const legacy = sessionData as any;
    return legacy.filter;
  }
  
  return null;
};

/**
 * Extract activity information from session data
 */
export const extractActivityInfo = (sessionData: any) => {
  if (!sessionData) return null;
  
  if (isEnhancedSessionData(sessionData)) {
    const enhanced = sessionData as any;
    return enhanced.activity;
  }
  
  if (isLegacySessionData(sessionData)) {
    const legacy = sessionData as any;
    return legacy.activity;
  }
  
  return null;
};

/**
 * Extract safety information from session data
 */
export const extractSafetyInfo = (sessionData: any) => {
  if (!sessionData) return null;
  
  if (isEnhancedSessionData(sessionData)) {
    const enhanced = sessionData as any;
    return enhanced.safety;
  }
  
  if (isLegacySessionData(sessionData)) {
    const legacy = sessionData as any;
    return legacy.safe;
  }
  
  return null;
};

/**
 * Extract last image information from session data
 */
export const extractLastImageInfo = (sessionData: any) => {
  if (!sessionData) return null;
  
  if (isEnhancedSessionData(sessionData)) {
    const enhanced = sessionData as any;
    return enhanced.image;
  }
  
  if (isLegacySessionData(sessionData)) {
    const legacy = sessionData as any;
    return legacy.lastImage;
  }
  
  return null;
};
