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
  formatTimestamp,
  formatTimeSince 
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

  const items: React.ReactNode[] = [];

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

  if (items.length === 0) return null;

  return (
    <Flex direction="column" gap="2" mb="3">
      {items}
    </Flex>
  );
};
