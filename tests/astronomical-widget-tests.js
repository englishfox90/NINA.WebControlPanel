// Comprehensive Tests for Time & Astronomical Widget
// Tests various edge cases and time scenarios for the 8-hour window chart

const fs = require('fs');
const path = require('path');

// Test data representing different scenarios throughout the year
const testScenarios = {
  // Summer solstice - longest day
  summerSolstice: {
    name: "Summer Solstice (June 21, Texas)",
    sunrise: "06:20:00",
    sunset: "20:30:00", 
    civilTwilightBegin: "05:50:00",
    civilTwilightEnd: "21:00:00",
    nauticalTwilightBegin: "05:15:00", 
    nauticalTwilightEnd: "21:35:00",
    astronomicalTwilightBegin: "04:40:00",
    astronomicalTwilightEnd: "22:10:00"
  },
  
  // Winter solstice - shortest day
  winterSolstice: {
    name: "Winter Solstice (December 21, Texas)",
    sunrise: "07:25:00",
    sunset: "17:35:00",
    civilTwilightBegin: "06:55:00",
    civilTwilightEnd: "18:05:00", 
    nauticalTwilightBegin: "06:20:00",
    nauticalTwilightEnd: "18:40:00",
    astronomicalTwilightBegin: "05:45:00",
    astronomicalTwilightEnd: "19:15:00"
  },
  
  // Current data (August 30, Texas)
  currentAugust: {
    name: "Current August Data (Texas)",
    sunrise: "07:11:11",
    sunset: "20:04:48",
    civilTwilightBegin: "06:45:22", 
    civilTwilightEnd: "20:28:22",
    nauticalTwilightBegin: "06:13:41",
    nauticalTwilightEnd: "20:57:41",
    astronomicalTwilightBegin: "05:40:44",
    astronomicalTwilightEnd: "21:27:44"
  }
};

// Test times throughout the day
const testTimes = [
  { time: "02:00", description: "Early morning - deep night" },
  { time: "05:30", description: "Pre-dawn - astronomical twilight" },
  { time: "06:30", description: "Dawn - civil twilight" },
  { time: "08:00", description: "Morning - full daylight" },
  { time: "12:00", description: "Noon - peak daylight" },
  { time: "16:00", description: "Afternoon - full daylight" },
  { time: "19:30", description: "Dusk - civil twilight" },
  { time: "21:00", description: "Evening - astronomical twilight" },
  { time: "23:30", description: "Late night - deep night" }
];

class AstronomicalChartTester {
  constructor(astronomicalData) {
    this.data = astronomicalData;
    this.results = [];
  }

  // Convert time string to minutes
  timeToMinutes(timeString) {
    const [hours, minutes, seconds = 0] = timeString.split(':').map(Number);
    return hours * 60 + minutes + (seconds / 60);
  }

  // Convert minutes back to time string
  minutesToTime(minutes) {
    const totalMinutes = Math.floor(minutes);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Determine phase at a specific time
  getPhaseAtTime(time) {
    const sunrise = this.timeToMinutes(this.data.sunrise);
    const sunset = this.timeToMinutes(this.data.sunset);
    const civilBegin = this.timeToMinutes(this.data.civilTwilightBegin);
    const civilEnd = this.timeToMinutes(this.data.civilTwilightEnd);
    const nauticalBegin = this.timeToMinutes(this.data.nauticalTwilightBegin);
    const nauticalEnd = this.timeToMinutes(this.data.nauticalTwilightEnd);
    const astroBegin = this.timeToMinutes(this.data.astronomicalTwilightBegin);
    const astroEnd = this.timeToMinutes(this.data.astronomicalTwilightEnd);
    
    const normalizedTime = ((time % (24 * 60)) + (24 * 60)) % (24 * 60);
    
    if (normalizedTime >= sunrise && normalizedTime <= sunset) {
      return 'Daylight';
    } else if (normalizedTime >= civilBegin && normalizedTime < sunrise) {
      return 'Civil Dawn';
    } else if (normalizedTime > sunset && normalizedTime <= civilEnd) {
      return 'Civil Dusk';
    } else if (normalizedTime >= nauticalBegin && normalizedTime < civilBegin) {
      return 'Nautical Dawn';
    } else if (normalizedTime > civilEnd && normalizedTime < nauticalEnd) {
      return 'Nautical Dusk';
    } else if (normalizedTime >= astroBegin && normalizedTime < nauticalBegin) {
      return 'Astronomical Dawn';
    } else if (normalizedTime >= nauticalEnd && normalizedTime < astroEnd) {
      return 'Astronomical Dusk';
    } else {
      return 'Night';
    }
  }

  // Test 8-hour window for a specific current time
  testTimeWindow(currentTimeStr) {
    const currentMinutes = this.timeToMinutes(currentTimeStr);
    const windowStart = currentMinutes - 4 * 60; // 4 hours before
    const windowEnd = currentMinutes + 4 * 60;   // 4 hours after
    
    // Create all astronomical events
    const events = [
      { time: this.timeToMinutes(this.data.sunrise), type: 'sunrise', name: 'Sunrise' },
      { time: this.timeToMinutes(this.data.sunset), type: 'sunset', name: 'Sunset' },
      { time: this.timeToMinutes(this.data.civilTwilightBegin), type: 'civilBegin', name: 'Civil Dawn Begin' },
      { time: this.timeToMinutes(this.data.civilTwilightEnd), type: 'civilEnd', name: 'Civil Dusk End' },
      { time: this.timeToMinutes(this.data.nauticalTwilightBegin), type: 'nauticalBegin', name: 'Nautical Dawn Begin' },
      { time: this.timeToMinutes(this.data.nauticalTwilightEnd), type: 'nauticalEnd', name: 'Nautical Dusk End' },
      { time: this.timeToMinutes(this.data.astronomicalTwilightBegin), type: 'astroBegin', name: 'Astronomical Dawn Begin' },
      { time: this.timeToMinutes(this.data.astronomicalTwilightEnd), type: 'astroEnd', name: 'Astronomical Dusk End' }
    ];

    // Handle day boundaries by duplicating events for previous/next day
    const extendedEvents = [...events];
    
    // Add previous day events (subtract 24 hours)
    events.forEach(event => {
      extendedEvents.push({
        ...event,
        time: event.time - 24 * 60,
        name: event.name + ' (Previous Day)'
      });
    });
    
    // Add next day events (add 24 hours)  
    events.forEach(event => {
      extendedEvents.push({
        ...event,
        time: event.time + 24 * 60,
        name: event.name + ' (Next Day)'
      });
    });

    // Filter events within the 8-hour window
    const windowEvents = extendedEvents
      .filter(event => event.time >= windowStart && event.time <= windowEnd)
      .sort((a, b) => a.time - b.time);

    // Create segments
    const segments = [];
    let segmentStart = windowStart;
    
    for (let i = 0; i <= windowEvents.length; i++) {
      const segmentEnd = i < windowEvents.length ? windowEvents[i].time : windowEnd;
      
      if (segmentEnd > segmentStart) {
        const phase = this.getPhaseAtTime(segmentStart);
        segments.push({
          start: this.minutesToTime(segmentStart),
          end: this.minutesToTime(segmentEnd),
          phase: phase,
          duration: Math.round(segmentEnd - segmentStart)
        });
      }
      
      if (i < windowEvents.length) {
        segmentStart = windowEvents[i].time;
      }
    }

    return {
      currentTime: currentTimeStr,
      windowStart: this.minutesToTime(windowStart),
      windowEnd: this.minutesToTime(windowEnd),
      windowEvents: windowEvents.map(e => ({
        time: this.minutesToTime(e.time),
        type: e.type,
        name: e.name
      })),
      segments: segments,
      totalDuration: Math.round(windowEnd - windowStart),
      currentPhase: this.getPhaseAtTime(currentMinutes)
    };
  }

  // Run comprehensive tests
  runAllTests() {
    console.log(`\n🧪 TESTING: ${this.data.name}`);
    console.log('='.repeat(60));
    
    testTimes.forEach(testCase => {
      const result = this.testTimeWindow(testCase.time);
      
      console.log(`\n⏰ ${testCase.time} - ${testCase.description}`);
      console.log(`📊 Current Phase: ${result.currentPhase}`);
      console.log(`🕐 Window: ${result.windowStart} → ${testCase.time} → ${result.windowEnd} (${result.totalDuration}min)`);
      console.log(`📅 Events in window: ${result.windowEvents.length}`);
      
      if (result.windowEvents.length > 0) {
        console.log('   Events:');
        result.windowEvents.forEach(event => {
          console.log(`     • ${event.time} - ${event.name}`);
        });
      }
      
      console.log(`🌅 Segments (${result.segments.length}):`);
      result.segments.forEach((segment, index) => {
        console.log(`     ${index + 1}. ${segment.start}-${segment.end}: ${segment.phase} (${segment.duration}min)`);
      });
      
      // Validation checks
      const checks = this.validateResult(result);
      if (checks.length > 0) {
        console.log('⚠️  Issues:');
        checks.forEach(check => console.log(`     ❌ ${check}`));
      } else {
        console.log('✅ All validations passed');
      }
    });
    
    // Summary
    this.printSummary();
  }

  // Validate test results
  validateResult(result) {
    const issues = [];
    
    // Check 8-hour duration
    if (result.totalDuration !== 480) { // 8 hours = 480 minutes
      issues.push(`Window duration is ${result.totalDuration}min, should be 480min`);
    }
    
    // Check segment continuity
    const segments = result.segments;
    for (let i = 1; i < segments.length; i++) {
      if (segments[i-1].end !== segments[i].start) {
        issues.push(`Gap between segment ${i-1} and ${i}: ${segments[i-1].end} → ${segments[i].start}`);
      }
    }
    
    // Check total segment duration equals window duration
    const totalSegmentDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);
    if (Math.abs(totalSegmentDuration - result.totalDuration) > 1) { // Allow 1 minute rounding error
      issues.push(`Total segment duration (${totalSegmentDuration}min) doesn't match window (${result.totalDuration}min)`);
    }
    
    return issues;
  }

  // Print test summary
  printSummary() {
    console.log(`\n📋 SUMMARY for ${this.data.name}:`);
    console.log('─'.repeat(40));
    console.log(`🌅 Sunrise: ${this.data.sunrise}`);
    console.log(`🌇 Sunset: ${this.data.sunset}`);
    console.log(`🌆 Civil End: ${this.data.civilTwilightEnd}`);
    console.log(`🌌 Nautical End: ${this.data.nauticalTwilightEnd}`);
    console.log(`⭐ Astronomical End: ${this.data.astronomicalTwilightEnd}`);
    
    const dayLength = this.timeToMinutes(this.data.sunset) - this.timeToMinutes(this.data.sunrise);
    console.log(`☀️ Daylight Duration: ${Math.round(dayLength)}min (${(dayLength/60).toFixed(1)}hrs)`);
  }
}

// Run tests for all scenarios
function runAllScenarios() {
  console.log('🔬 ASTRONOMICAL WIDGET COMPREHENSIVE TESTING');
  console.log('='.repeat(80));
  console.log('Testing 8-hour window behavior across different seasons and times');
  
  Object.values(testScenarios).forEach(scenario => {
    const tester = new AstronomicalChartTester(scenario);
    tester.runAllTests();
    console.log('\n' + '='.repeat(80));
  });
  
  console.log('\n🎯 KEY TEST OBJECTIVES:');
  console.log('✓ 8-hour window always maintained (4hrs before/after current time)');
  console.log('✓ Twilight phases positioned correctly based on season');
  console.log('✓ Dawn and dusk can appear in same window during winter');
  console.log('✓ Segment continuity and duration accuracy');
  console.log('✓ Cross-day boundary handling');
}

// Edge case tests
function testEdgeCases() {
  console.log('\n🔍 EDGE CASE TESTING');
  console.log('='.repeat(50));
  
  // Test midnight crossing
  const winterTester = new AstronomicalChartTester(testScenarios.winterSolstice);
  console.log('\n🌙 Midnight crossing test (00:30 in winter):');
  const midnightResult = winterTester.testTimeWindow("00:30");
  console.log(`Window: ${midnightResult.windowStart} → 00:30 → ${midnightResult.windowEnd}`);
  console.log(`Segments: ${midnightResult.segments.length}`);
  console.log('Events in window:', midnightResult.windowEvents.map(e => `${e.time} ${e.name}`).join(', '));
  
  // Test very short winter day
  console.log('\n❄️ Short winter day coverage:');
  const dawnResult = winterTester.testTimeWindow("07:00"); // Near sunrise
  const duskResult = winterTester.testTimeWindow("18:00"); // Near sunset
  
  const dawnEvents = dawnResult.windowEvents.filter(e => e.name.includes('Dawn')).length;
  const duskEvents = duskResult.windowEvents.filter(e => e.name.includes('Dusk')).length;
  
  console.log(`Dawn window (07:00) has ${dawnEvents} dawn events and ${dawnResult.windowEvents.filter(e => e.name.includes('Dusk')).length} dusk events`);
  console.log(`Dusk window (18:00) has ${duskEvents} dusk events and ${duskResult.windowEvents.filter(e => e.name.includes('Dawn')).length} dawn events`);
  
  if (dawnResult.windowEvents.some(e => e.name.includes('Dusk')) && 
      duskResult.windowEvents.some(e => e.name.includes('Dawn'))) {
    console.log('✅ CONFIRMED: Dawn and dusk can appear in same 8-hour window during winter!');
  }
}

// Run all tests
if (require.main === module) {
  runAllScenarios();
  testEdgeCases();
  
  console.log('\n🚀 Next steps:');
  console.log('1. Verify widget handles multi-day data from backend API');
  console.log('2. Test chart display with these edge cases in browser');
  console.log('3. Validate hover tooltips show correct phase time ranges');
}

module.exports = { AstronomicalChartTester, testScenarios, testTimes };
