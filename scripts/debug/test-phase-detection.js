#!/usr/bin/env node
// Test script to verify current phase detection is working correctly
// This script will test the phase detection at the current time and show the results

const AstronomicalService = require('../../src/services/astronomicalService');

async function testPhaseDetection() {
  console.log('🌅 Testing Current Phase Detection');
  console.log('==================================');
  
  const astronomicalService = new AstronomicalService();
  const now = new Date();
  
  // Test location (Austin, TX)
  const latitude = 31.5475;
  const longitude = -99.3817;
  const timezone = 'America/Chicago';
  
  try {
    console.log(`Current time: ${now.toLocaleString()}`);
    console.log(`Location: ${latitude}, ${longitude} (${timezone})`);
    console.log('');
    
    // Get astronomical data
    const astronomicalData = await astronomicalService.getComprehensiveAstronomicalData(
      latitude, longitude, timezone
    );
    
    console.log('Astronomical Times for Today:');
    console.log(`  Sunrise: ${astronomicalData.sunrise}`);
    console.log(`  Sunset: ${astronomicalData.sunset}`);
    console.log(`  Civil Twilight: ${astronomicalData.civilTwilightBegin} - ${astronomicalData.civilTwilightEnd}`);
    console.log(`  Nautical Twilight: ${astronomicalData.nauticalTwilightBegin} - ${astronomicalData.nauticalTwilightEnd}`);
    console.log(`  Astronomical Twilight: ${astronomicalData.astronomicalTwilightBegin} - ${astronomicalData.astronomicalTwilightEnd}`);
    console.log('');
    
    // Test current phase detection
    const currentPhase = astronomicalService.getCurrentPhase(now, astronomicalData);
    
    console.log('Phase Detection Results:');
    console.log(`  Current Phase: ${currentPhase}`);
    console.log('');
    
    // Test at specific times to verify logic
    const testTimes = [
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0), // Noon
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0), // 7 PM
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0), // 9 PM
      new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0, 0), // 11 PM
    ];
    
    console.log('Testing Different Times:');
    testTimes.forEach(testTime => {
      const phase = astronomicalService.getCurrentPhase(testTime, astronomicalData);
      console.log(`  ${testTime.toLocaleTimeString()}: ${phase}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing phase detection:', error);
  }
}

// Run the test
testPhaseDetection().then(() => {
  console.log('\n✅ Phase detection test complete');
  process.exit(0);
});
