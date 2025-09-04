/**
 * MoonPhaseUtils - Moon phase utilities and icon selection
 * Part of modularized TimeAstronomicalWidget (keeping files under 500 LOC)
 */

import React from 'react';
import { 
  WiMoonNew,
  WiMoonWaxingCrescent3,
  WiMoonFirstQuarter,
  WiMoonWaxingGibbous3,
  WiMoonFull,
  WiMoonWaningGibbous3,
  WiMoonThirdQuarter,
  WiMoonWaningCrescent3
} from 'weather-icons-react';

/**
 * Get appropriate moon phase icon component
 */
export const getMoonIcon = (phase: string): React.ReactElement => {
  const iconProps = { size: 28, color: 'var(--amber-9)' };
  
  switch (phase) {
    case 'new_moon': return <WiMoonNew {...iconProps} />;
    case 'waxing_crescent': return <WiMoonWaxingCrescent3 {...iconProps} />;
    case 'first_quarter': return <WiMoonFirstQuarter {...iconProps} />;
    case 'waxing_gibbous': return <WiMoonWaxingGibbous3 {...iconProps} />;
    case 'full_moon': return <WiMoonFull {...iconProps} />;
    case 'waning_gibbous': return <WiMoonWaningGibbous3 {...iconProps} />;
    case 'last_quarter': return <WiMoonThirdQuarter {...iconProps} />;
    case 'waning_crescent': return <WiMoonWaningCrescent3 {...iconProps} />;
    default: return <WiMoonNew {...iconProps} />;
  }
};

/**
 * Get human-readable moon phase name
 */
export const getMoonPhaseName = (phase: string): string => {
  return phase.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Get moon phase description
 */
export const getMoonPhaseDescription = (phase: string, illumination: number): string => {
  const phaseName = getMoonPhaseName(phase);
  return `${phaseName} moon - ${Math.round(illumination)}% illuminated`;
};
