/**
 * Session Activity Component
 * Displays current session activity, filter, and last image information
 */

import React from 'react';
import { Flex, Text } from '@radix-ui/themes';
import { 
  ActivityLogIcon,
  EyeOpenIcon,
  CameraIcon
} from '@radix-ui/react-icons';
import { 
  extractActivityInfo, 
  extractFilterInfo, 
  extractLastImageInfo, 
  extractFlatInfo,
  extractDarkInfo,
  formatTimestamp,
  formatTimeSince,
  formatFlatStatus,
  formatDarkStatus,
  isCapturingFlats,
  isCapturingDarks 
} from './utils';

interface SessionActivityProps {
  sessionData: any;
  enableTimezoneFormatting?: boolean;
}

export const SessionActivity: React.FC<SessionActivityProps> = ({ 
  sessionData, 
  enableTimezoneFormatting = true 
}) => {
  const activityInfo = extractActivityInfo(sessionData);
  const filterInfo = extractFilterInfo(sessionData);
  const lastImageInfo = extractLastImageInfo(sessionData);
  const flatInfo = extractFlatInfo(sessionData);
  const darkInfo = extractDarkInfo(sessionData);
  const isFlatsActive = isCapturingFlats(sessionData);
  const isDarksActive = isCapturingDarks(sessionData);

  const items: React.ReactNode[] = [];

  // Priority 1: Dark capture status (highest priority for calibration frames)
  if (isDarksActive) {
    const darkStatus = formatDarkStatus(sessionData);
    if (darkStatus) {
      items.push(
        <Flex key="darks" align="center" gap="2">
          <ActivityLogIcon width="14" height="14" />
          <Text size="2" color={darkStatus.color as any}>
            {darkStatus.text}
          </Text>
          {darkInfo?.startedAt && (
            <Text size="1" color="gray">
              (started {formatTimestamp(darkInfo.startedAt, enableTimezoneFormatting)})
            </Text>
          )}
        </Flex>
      );
    }
    
    // Show last dark image if available
    if (darkInfo?.lastImageAt) {
      items.push(
        <Flex key="dark-image" align="center" gap="2">
          <CameraIcon width="14" height="14" />
          <Text size="2">
            Last Dark: {formatTimestamp(darkInfo.lastImageAt, enableTimezoneFormatting)}
          </Text>
          <Text size="1" color="gray">
            ({formatTimeSince(darkInfo.lastImageAt)})
          </Text>
        </Flex>
      );
    }
  } else if (isFlatsActive) {
    // Priority 2: Flat capture status (if active and no darks)
    const flatStatus = formatFlatStatus(sessionData);
    if (flatStatus) {
      items.push(
        <Flex key="flats" align="center" gap="2">
          <EyeOpenIcon width="14" height="14" />
          <Text size="2" color={flatStatus.color as any}>
            {flatStatus.text}
          </Text>
          {flatInfo?.startedAt && (
            <Text size="1" color="gray">
              (started {formatTimestamp(flatInfo.startedAt, enableTimezoneFormatting)})
            </Text>
          )}
        </Flex>
      );
    }
    
    // Show last flat image if available
    if (flatInfo?.lastImageAt) {
      items.push(
        <Flex key="flat-image" align="center" gap="2">
          <CameraIcon width="14" height="14" />
          <Text size="2">
            Last Flat: {formatTimestamp(flatInfo.lastImageAt, enableTimezoneFormatting)}
          </Text>
          <Text size="1" color="gray">
            ({formatTimeSince(flatInfo.lastImageAt)})
          </Text>
        </Flex>
      );
    }
  } else {
    // Standard session activities (when not capturing flats)
    
    // Current Filter
    if (filterInfo?.name) {
      items.push(
        <Flex key="filter" align="center" gap="2">
          <EyeOpenIcon width="14" height="14" />
          <Text size="2">Filter: {filterInfo.name}</Text>
          {filterInfo.since && (
            <Text size="1" color="gray">
              (since {formatTimestamp(filterInfo.since, enableTimezoneFormatting)})
            </Text>
          )}
        </Flex>
      );
    }

    // Last Image
    const lastImageTime = lastImageInfo?.lastSavedAt || lastImageInfo?.time;
    if (lastImageTime) {
      items.push(
        <Flex key="image" align="center" gap="2">
          <CameraIcon width="14" height="14" />
          <Text size="2">
            Last Image: {formatTimestamp(lastImageTime, enableTimezoneFormatting)}
          </Text>
          <Text size="1" color="gray">
            ({formatTimeSince(lastImageTime)})
          </Text>
        </Flex>
      );
    }

    // Current Activity
    if (activityInfo?.state && activityInfo?.subsystem) {
      items.push(
        <Flex key="activity" align="center" gap="2">
          <ActivityLogIcon width="14" height="14" />
          <Text size="2" style={{ textTransform: 'capitalize' }}>
            {activityInfo.subsystem}: {activityInfo.state}
          </Text>
          {activityInfo.since && (
            <Text size="1" color="gray">
              (since {formatTimestamp(activityInfo.since, enableTimezoneFormatting)})
            </Text>
          )}
        </Flex>
      );
    }
  }

  if (items.length === 0) return null;

  return (
    <Flex direction="column" gap="2" mb="3">
      {items}
    </Flex>
  );
};
