#!/usr/bin/env node
// Test script to verify phase generation for current time window
// Shows what phases should be visible in the 8-hour window

const http = require('http');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
}

async function testPhaseGeneration() {
  console.log('🌅 Testing Phase Generation for 8-Hour Window');
  console.log('===============================================');
  
  const now = new Date();
  const windowStart = new Date(now.getTime() - 4 * 60 * 60 * 1000); // 4 hours before
  const windowEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours after
  
  console.log(`Current time: ${now.toLocaleString()}`);
  console.log(`Window: ${windowStart.toLocaleString()} to ${windowEnd.toLocaleString()}`);
  console.log('');
  
  // Get astronomical data from API
  try {
    const data = await makeRequest('http://localhost:3001/api/time/astronomical');
    const astro = data.astronomical;
    
    console.log('Astronomical Times for Today:');
    console.log(`  Sunrise: ${astro.sunrise}`);
    console.log(`  Sunset: ${astro.sunset}`);
    console.log(`  Civil: ${astro.civilTwilightBegin} - ${astro.civilTwilightEnd}`);
    console.log(`  Nautical: ${astro.nauticalTwilightBegin} - ${astro.nauticalTwilightEnd}`);
    console.log(`  Astronomical: ${astro.astronomicalTwilightBegin} - ${astro.astronomicalTwilightEnd}`);
    console.log('');
    
    // Helper to create time from today's date + time string
    const createTime = (timeStr) => {
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      const date = new Date(now);
      date.setHours(hours, minutes, seconds, 0);
      return date;
    };
    
    // Check which phases intersect with our window
    console.log('Phases in Current 8-Hour Window:');
    
    const phases = [
      { name: 'Daylight', start: createTime(astro.sunrise), end: createTime(astro.sunset) },
      { name: 'Civil Dusk', start: createTime(astro.sunset), end: createTime(astro.civilTwilightEnd) },
      { name: 'Nautical Dusk', start: createTime(astro.civilTwilightEnd), end: createTime(astro.nauticalTwilightEnd) },
      { name: 'Astronomical Dusk', start: createTime(astro.nauticalTwilightEnd), end: createTime(astro.astronomicalTwilightEnd) },
      { name: 'Night', start: createTime(astro.astronomicalTwilightEnd), end: new Date(createTime(astro.astronomicalTwilightEnd).getTime() + 8*60*60*1000) }
    ];
    
    phases.forEach(phase => {
      const intersects = phase.start < windowEnd && phase.end > windowStart;
      if (intersects) {
        const clampedStart = phase.start < windowStart ? windowStart : phase.start;
        const clampedEnd = phase.end > windowEnd ? windowEnd : phase.end;
        const duration = (clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60); // minutes
        
        console.log(`  ✅ ${phase.name}: ${clampedStart.toLocaleTimeString()} - ${clampedEnd.toLocaleTimeString()} (${Math.round(duration)}min)`);
      } else {
        console.log(`  ❌ ${phase.name}: Outside window`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing phase generation:', error);
  }
}

testPhaseGeneration().then(() => {
  console.log('\n✅ Phase generation test complete');
  process.exit(0);
});
