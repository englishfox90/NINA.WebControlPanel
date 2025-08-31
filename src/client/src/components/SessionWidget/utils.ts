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
 * Extract flat capture information from session data
 */
export const extractFlatInfo = (sessionData: any) => {
  if (!sessionData) return null;
  
  if (isEnhancedSessionData(sessionData)) {
    const enhanced = sessionData as any;
    return enhanced.flats || null;
  }
  
  // Check if legacy session has flat activity
  if (isLegacySessionData(sessionData)) {
    const legacy = sessionData as any;
    if (legacy.activity?.subsystem === 'flats') {
      return {
        isActive: legacy.activity.state === 'capturing_flats' || legacy.activity.state === 'calibrating_flats',
        filter: legacy.filter?.name || null,
        brightness: null, // Not available in legacy format
        imageCount: 0, // Would need to track separately
        startedAt: legacy.activity.since,
        lastImageAt: legacy.lastImage?.time || null,
        state: legacy.activity.state
      };
    }
  }
  
  return null;
};

/**
 * Extract dark capture information from session data
 */
export const extractDarkInfo = (sessionData: any) => {
  if (!sessionData) return null;
  
  if (isEnhancedSessionData(sessionData)) {
    const enhanced = sessionData as any;
    return enhanced.darks || null;
  }
  
  // Check if legacy session has dark activity
  if (isLegacySessionData(sessionData)) {
    const legacy = sessionData as any;
    if (legacy.activity?.subsystem === 'darks') {
      return {
        isActive: legacy.activity.state === 'capturing_darks',
        currentExposureTime: legacy.activity.details?.exposureTime || null,
        exposureGroups: {},
        totalImages: legacy.activity.details?.totalImages || 0,
        startedAt: legacy.activity.since,
        lastImageAt: legacy.lastImage?.time || null,
        state: legacy.activity.state,
        details: legacy.activity.details
      };
    }
  }
  
  return null;
};

/**
 * Check if session is currently capturing flats
 */
export const isCapturingFlats = (sessionData: any): boolean => {
  const flatInfo = extractFlatInfo(sessionData);
  return flatInfo?.isActive === true || false;
};

/**
 * Check if session is currently capturing darks
 */
export const isCapturingDarks = (sessionData: any): boolean => {
  const darkInfo = extractDarkInfo(sessionData);
  return darkInfo?.isActive === true || false;
};

/**
 * Format flat capture status for display
 */
export const formatFlatStatus = (sessionData: any): { text: string; color: string } | null => {
  const flatInfo = extractFlatInfo(sessionData);
  if (!flatInfo || !flatInfo.isActive) return null;
  
  const state = (flatInfo as any).state;
  if (state === 'calibrating_flats') {
    return {
      text: `Calibrating flats${flatInfo.filter ? ` (${flatInfo.filter})` : ''}`,
      color: 'orange'
    };
  } else if (state === 'capturing_flats') {
    return {
      text: `Capturing flats${flatInfo.filter ? ` (${flatInfo.filter})` : ''}${flatInfo.imageCount > 0 ? ` - ${flatInfo.imageCount} taken` : ''}`,
      color: 'blue'
    };
  }
  
  return {
    text: `Flat panel active${flatInfo.filter ? ` (${flatInfo.filter})` : ''}`,
    color: 'gray'
  };
};

/**
 * Format dark capture status for display
 */
export const formatDarkStatus = (sessionData: any): { text: string; color: string } | null => {
  const darkInfo = extractDarkInfo(sessionData);
  if (!darkInfo || !darkInfo.isActive) return null;
  
  const currentExposure = darkInfo.currentExposureTime;
  const totalImages = darkInfo.totalImages || 0;
  const exposureCount = darkInfo.details?.exposureCount || 0;
  const totalExposures = darkInfo.details?.totalExposures || Object.keys(darkInfo.exposureGroups || {}).length;
  
  let text = 'Capturing darks';
  
  if (currentExposure) {
    text += ` (${currentExposure}s)`;
    if (exposureCount > 0) {
      text += ` - ${exposureCount} taken`;
    }
  } else if (totalImages > 0) {
    text += ` - ${totalImages} total`;
  }
  
  if (totalExposures > 1) {
    text += ` [${totalExposures} exposure times]`;
  }
  
  return {
    text,
    color: 'purple'
  };
};

/**
 * Extract target information from session data
 */
export const extractTargetInfo = (sessionData: any) => {
  if (!sessionData) return null;
  
  let target = null;
  
  if (isEnhancedSessionData(sessionData)) {
    const enhanced = sessionData as any;
    target = enhanced.target;
  } else if (isLegacySessionData(sessionData)) {
    const legacy = sessionData as any;
    target = legacy.target;
  }
  
  // Don't show expired targets in the UI
  if (target && target.isExpired) {
    return null;
  }
  
  return target;
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
