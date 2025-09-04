/**
 * PhaseCalculator - Calculates time phases for 8-hour window display
 * Part of modularized TimeAstronomicalWidget (keeping files under 500 LOC)
 */

import type { TimeAstronomicalData, TimePhase } from '../../interfaces/system';

export class PhaseCalculator {
  /**
   * Generate 8-hour window phases using multi-day astronomical data
   * @param data - Astronomical data from API
   * @param currentTime - Current server time as reference
   * @returns Array of time phases for the 8-hour window
   */
  calculatePhases(data: TimeAstronomicalData, currentTime: Date): TimePhase[] {
    if (!data?.astronomical?.multiDay?.today?.date) {
      console.log('⚠️ MultiDay data not available, skipping phase calculations');
      return [];
    }

    const phases: TimePhase[] = [];
    const windowStart = new Date(currentTime.getTime() - 4 * 60 * 60 * 1000); // 4 hours before
    const windowEnd = new Date(currentTime.getTime() + 4 * 60 * 60 * 1000); // 4 hours after

    const { yesterday, today, tomorrow } = data.astronomical.multiDay;

    // Helper function to add phase if it intersects with our 8-hour window
    const addPhaseIfVisible = (start: Date, end: Date, name: string, color: string, description: string) => {
      // Check if phase intersects with our window
      if (start < windowEnd && end > windowStart) {
        // Clamp to window boundaries for chart display
        const clampedStart = start < windowStart ? windowStart : start;
        const clampedEnd = end > windowEnd ? windowEnd : end;
        
        phases.push({
          name,
          start: clampedStart,  // Used for chart display
          end: clampedEnd,      // Used for chart display
          color,
          description,
          realStart: start,     // Real phase start time for tooltip
          realEnd: end          // Real phase end time for tooltip
        });
      }
    };

    // Helper to create dates from date strings and time strings
    const createDate = (dateStr: string, timeStr: string): Date => {
      const dateTimeStr = `${dateStr}T${timeStr}`;
      return new Date(dateTimeStr);
    };

    // Add yesterday's evening phases if they extend into our window
    this.addYesterdayPhases(yesterday, addPhaseIfVisible, createDate);
    
    // Add today's phases
    this.addTodayPhases(yesterday, today, tomorrow, addPhaseIfVisible, createDate);
    
    // Add tomorrow's morning phases if they're in our window
    this.addTomorrowPhases(tomorrow, addPhaseIfVisible, createDate);

    return phases.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Add yesterday's evening phases (sunset, twilights, night start)
   */
  private addYesterdayPhases(yesterday: any, addPhaseIfVisible: Function, createDate: Function) {
    if (yesterday.sunset) {
      addPhaseIfVisible(
        createDate(yesterday.date, yesterday.sunset),
        yesterday.civilTwilightEnd ? createDate(yesterday.date, yesterday.civilTwilightEnd) : 
          new Date(createDate(yesterday.date, yesterday.sunset).getTime() + 60*60*1000),
        'Civil Dusk',
        '#FFA500',
        'Golden hour after sunset'
      );
    }

    if (yesterday.civilTwilightEnd && yesterday.nauticalTwilightEnd) {
      addPhaseIfVisible(
        createDate(yesterday.date, yesterday.civilTwilightEnd),
        createDate(yesterday.date, yesterday.nauticalTwilightEnd),
        'Nautical Dusk',
        '#4169E1',
        'Deep blue twilight'
      );
    }

    if (yesterday.nauticalTwilightEnd && yesterday.astronomicalTwilightEnd) {
      addPhaseIfVisible(
        createDate(yesterday.date, yesterday.nauticalTwilightEnd),
        createDate(yesterday.date, yesterday.astronomicalTwilightEnd),
        'Astronomical Dusk',
        '#4C1D95', // Lighter purple for better contrast
        'Last light of day'
      );
    }
  }

  /**
   * Add today's phases (night, dawn, day, dusk)
   */
  private addTodayPhases(yesterday: any, today: any, tomorrow: any, addPhaseIfVisible: Function, createDate: Function) {
    // Night phase from yesterday astronomical end to today astronomical begin
    if (yesterday.astronomicalTwilightEnd) {
      const nightStart = createDate(yesterday.date, yesterday.astronomicalTwilightEnd);
      const nightEnd = today.astronomicalTwilightBegin ? 
        createDate(today.date, today.astronomicalTwilightBegin) : 
        new Date(nightStart.getTime() + 8*60*60*1000);
      
      addPhaseIfVisible(nightStart, nightEnd, 'Night', '#1E3A8A', 'Complete darkness'); // Brighter blue for better contrast
    }

    // Dawn phases
    if (today.astronomicalTwilightBegin && today.nauticalTwilightBegin) {
      addPhaseIfVisible(
        createDate(today.date, today.astronomicalTwilightBegin),
        createDate(today.date, today.nauticalTwilightBegin),
        'Astronomical Dawn',
        '#4C1D95', // Lighter purple for better contrast
        'First light of dawn'
      );
    }

    if (today.nauticalTwilightBegin && today.civilTwilightBegin) {
      addPhaseIfVisible(
        createDate(today.date, today.nauticalTwilightBegin),
        createDate(today.date, today.civilTwilightBegin),
        'Nautical Dawn',
        '#4169E1',
        'Early morning twilight'
      );
    }

    if (today.civilTwilightBegin && today.sunrise) {
      addPhaseIfVisible(
        createDate(today.date, today.civilTwilightBegin),
        createDate(today.date, today.sunrise),
        'Civil Dawn',
        '#FFA500',
        'Golden hour before sunrise'
      );
    }

    // Daylight
    if (today.sunrise && today.sunset) {
      addPhaseIfVisible(
        createDate(today.date, today.sunrise),
        createDate(today.date, today.sunset),
        'Daylight',
        '#FFD700',
        'Full daylight'
      );
    }

    // Dusk phases
    if (today.sunset && today.civilTwilightEnd) {
      addPhaseIfVisible(
        createDate(today.date, today.sunset),
        createDate(today.date, today.civilTwilightEnd),
        'Civil Dusk',
        '#FFA500',
        'Golden hour after sunset'
      );
    }

    if (today.civilTwilightEnd && today.nauticalTwilightEnd) {
      addPhaseIfVisible(
        createDate(today.date, today.civilTwilightEnd),
        createDate(today.date, today.nauticalTwilightEnd),
        'Nautical Dusk',
        '#4169E1',
        'Deep blue twilight'
      );
    }

    if (today.nauticalTwilightEnd && today.astronomicalTwilightEnd) {
      addPhaseIfVisible(
        createDate(today.date, today.nauticalTwilightEnd),
        createDate(today.date, today.astronomicalTwilightEnd),
        'Astronomical Dusk',
        '#4C1D95', // Lighter purple for better contrast
        'Last light of day'
      );
    }

    // Night phase from today astronomical end to tomorrow astronomical begin
    if (today.astronomicalTwilightEnd) {
      const nightStart = createDate(today.date, today.astronomicalTwilightEnd);
      const nightEnd = tomorrow.astronomicalTwilightBegin ? 
        createDate(tomorrow.date, tomorrow.astronomicalTwilightBegin) : 
        new Date(nightStart.getTime() + 8*60*60*1000);
      
      addPhaseIfVisible(nightStart, nightEnd, 'Night', '#1E3A8A', 'Complete darkness'); // Brighter blue for better contrast
    }
  }

  /**
   * Add tomorrow's morning phases (dawn phases and sunrise)
   */
  private addTomorrowPhases(tomorrow: any, addPhaseIfVisible: Function, createDate: Function) {
    if (tomorrow.astronomicalTwilightBegin && tomorrow.nauticalTwilightBegin) {
      addPhaseIfVisible(
        createDate(tomorrow.date, tomorrow.astronomicalTwilightBegin),
        createDate(tomorrow.date, tomorrow.nauticalTwilightBegin),
        'Astronomical Dawn',
        '#4C1D95', // Lighter purple for better contrast
        'First light of dawn'
      );
    }

    if (tomorrow.nauticalTwilightBegin && tomorrow.civilTwilightBegin) {
      addPhaseIfVisible(
        createDate(tomorrow.date, tomorrow.nauticalTwilightBegin),
        createDate(tomorrow.date, tomorrow.civilTwilightBegin),
        'Nautical Dawn',
        '#4169E1',
        'Early morning twilight'
      );
    }

    if (tomorrow.civilTwilightBegin && tomorrow.sunrise) {
      addPhaseIfVisible(
        createDate(tomorrow.date, tomorrow.civilTwilightBegin),
        createDate(tomorrow.date, tomorrow.sunrise),
        'Civil Dawn',
        '#FFA500',
        'Golden hour before sunrise'
      );
    }
  }
}

// Export singleton instance
export const phaseCalculator = new PhaseCalculator();
