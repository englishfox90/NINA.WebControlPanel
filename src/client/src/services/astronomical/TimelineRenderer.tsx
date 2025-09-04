/**
 * TimelineRenderer - SVG-based timeline for astronomical phases
 * Replaces the problematic Chart.js pie chart with a simple, hoverable SVG timeline
 * Part of modularized TimeAstronomicalWidget (keeping files under 500 LOC)
 */

import React from 'react';
import { HoverCard, Text, Flex, Box, Card } from '@radix-ui/themes';
import type { TimePhase } from '../../interfaces/system';

interface TimelineRendererProps {
  phases: TimePhase[];
  currentTime: Date;
  formatTime12Hour: (date: Date) => string;
}

export const TimelineRenderer: React.FC<TimelineRendererProps> = ({ 
  phases, 
  currentTime, 
  formatTime12Hour 
}) => {
  if (phases.length === 0) {
    return (
      <Box style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text color="gray">No astronomical data available</Text>
      </Box>
    );
  }

  // Calculate 8-hour window
  const windowStart = new Date(currentTime.getTime() - 4 * 60 * 60 * 1000);
  const windowEnd = new Date(currentTime.getTime() + 4 * 60 * 60 * 1000);
  const totalDuration = windowEnd.getTime() - windowStart.getTime();

  // Calculate current time position as percentage
  const currentTimePosition = ((currentTime.getTime() - windowStart.getTime()) / totalDuration) * 100;

  // Calculate phase positions and widths
  const phaseElements = phases.map((phase, index) => {
    const phaseDuration = phase.end.getTime() - phase.start.getTime();
    const phaseWidth = (phaseDuration / totalDuration) * 100;
    const leftOffset = ((phase.start.getTime() - windowStart.getTime()) / totalDuration) * 100;

    return {
      ...phase,
      width: phaseWidth,
      left: leftOffset,
      index
    };
  });

  return (
    <Card variant="surface" style={{ backgroundColor: 'var(--gray-3)', borderRadius: '8px' }}>
      <Box style={{ height: '200px', position: 'relative', padding: '20px' }}>
        {/* Main Timeline SVG */}
        <svg width="100%" height="120" style={{ display: 'block' }}>
        {/* Background line */}
        <line 
          x1="0" 
          y1="60" 
          x2="100%" 
          y2="60" 
          stroke="#94A3B8" 
          strokeWidth="2"
        />
        
        {/* Phase segments */}
        {phaseElements.map((phase) => (
          <g key={`timeline-segment-${phase.index}`}>
            {/* Phase line segment */}
            <line
              x1={`${phase.left}%`}
              y1="60"
              x2={`${phase.left + phase.width}%`}
              y2="60"
              stroke={phase.color}
              strokeWidth="8"
              strokeLinecap="round"
            />
            
            {/* Phase label (for major phases) */}
            {phase.width > 15 && ( // Only show labels for phases wider than 15%
              <text
                x={`${phase.left + phase.width / 2}%`}
                y="45"
                textAnchor="middle"
                fontSize="10"
                fill={phase.color}
                fontWeight="500"
              >
                {phase.name === 'Astronomical Dawn' ? 'Astro Dawn' :
                 phase.name === 'Astronomical Dusk' ? 'Astro Dusk' :
                 phase.name === 'Nautical Dawn' ? 'Nautical' :
                 phase.name === 'Nautical Dusk' ? 'Nautical' :
                 phase.name}
              </text>
            )}
          </g>
        ))}
        
        {/* Current time indicator */}
        <g>
          <line
            x1={`${currentTimePosition}%`}
            y1="30"
            x2={`${currentTimePosition}%`}
            y2="90"
            stroke="#DC2626"
            strokeWidth="3"
            strokeDasharray="2,2"
          />
          <circle
            cx={`${currentTimePosition}%`}
            cy="60"
            r="6"
            fill="#DC2626"
            stroke="white"
            strokeWidth="2"
          />
        </g>
        
        {/* Time markers */}
        <g>
          {/* -4hr marker */}
          <line x1="0" y1="70" x2="0" y2="80" stroke="#666" strokeWidth="1"/>
          <text x="5%" y="95" fontSize="10" fill="#666" textAnchor="start">-4hr</text>
          
          {/* Current time marker */}
          <text 
            x={`${currentTimePosition}%`} 
            y="25" 
            textAnchor="middle" 
            fontSize="10" 
            fill="white"
            fontWeight="bold"
          >
            NOW
          </text>
          
          {/* +4hr marker */}
          <line x1="100%" y1="70" x2="100%" y2="80" stroke="#666" strokeWidth="1"/>
          <text x="95%" y="95" fontSize="10" fill="#666" textAnchor="end">+4hr</text>
        </g>
      </svg>

      {/* Invisible hover areas for HoverCards */}
      {phaseElements.map((phase) => (
        <HoverCard.Root key={`hover-${phase.index}`}>
          <HoverCard.Trigger>
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: `${phase.left}%`,
                width: `${phase.width}%`,
                height: '120px',
                cursor: 'pointer',
                zIndex: 10,
                backgroundColor: 'transparent'
              }}
            />
          </HoverCard.Trigger>
          <HoverCard.Content side="top" align="center" sideOffset={8}>
            <Flex direction="column" gap="2" style={{ minWidth: '180px' }}>
              <Text size="3" weight="bold">{phase.name}</Text>
              <Text size="2" color="gray">{phase.description}</Text>
              <div>
                <Text size="2">
                  <strong>Starts:</strong> {formatTime12Hour(phase.realStart)}
                </Text>
              </div>
              <div>
                <Text size="2">
                  <strong>Ends:</strong> {formatTime12Hour(phase.realEnd)}
                </Text>
              </div>
            </Flex>
          </HoverCard.Content>
        </HoverCard.Root>
      ))}

      {/* Timeline description */}
      <Box style={{ 
        position: 'absolute', 
        bottom: '0px', 
        left: '50%', 
        transform: 'translateX(-50%)',
        textAlign: 'center'
      }}>
        <Text size="1" color="gray">8-hour astronomical timeline (hover for details)</Text>
      </Box>
    </Box>
    </Card>
  );
};
