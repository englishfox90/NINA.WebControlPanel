#!/usr/bin/env node
// Test script to verify timezone conversion in phase detection

const AstronomicalService = require('../../src/services/astronomicalService');

async function testTimezoneConversion() {
  console.log('🌅 Testing Timezone Conversion in Phase Detection');
  console.log('=================================================');
  
  const astronomicalService = new AstronomicalService();
  
  // Test location (Austin, TX)
  const latitude = 31.5475;
  const longitude = -99.3817;
  const timezone = 'America/Chicago';
  
  try {
    // Get astronomical data
    const astronomicalData = await astronomicalService.getComprehensiveAstronomicalData(
      latitude, longitude, timezone
    );
    
    console.log('Astronomical Times (Local):');
    console.log(`  Astronomical Twilight End: ${astronomicalData.astronomicalTwilightEnd}`);
    console.log('');
    
    // Test with current time
    const now = new Date();
    const localNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    
    console.log('Time Comparison:');
    console.log(`  UTC Time: ${now.toISOString()}`);
    console.log(`  Local Time: ${localNow.toLocaleString()}`);
    console.log(`  Local Time (hours:minutes): ${localNow.getHours()}:${String(localNow.getMinutes()).padStart(2,'0')}`);
    console.log('');
    
    // Test current phase detection
    const currentPhase = astronomicalService.getCurrentPhase(now, astronomicalData);
    console.log(`Current Phase: ${currentPhase}`);
    
    // Test specific times around 9:12 PM
    const testTime912 = new Date();
    testTime912.setHours(21, 12, 0, 0); // 9:12 PM UTC
    
    const testTime912Local = new Date();
    // Set to 9:12 PM in local timezone
    const localDate = new Date();
    localDate.setHours(21, 12, 0, 0);
    const utcEquivalent = new Date(localDate.toLocaleString("en-US", { timeZone: "UTC" }));
    
    console.log('\nTesting 9:12 PM local time:');
    console.log(`  Test UTC time: ${utcEquivalent.toISOString()}`);
    console.log(`  Should be: astronomical (before 21:27:44)`);
    const phase912 = astronomicalService.getCurrentPhase(utcEquivalent, astronomicalData);
    console.log(`  Actual phase: ${phase912}`);
    
  } catch (error) {
    console.error('❌ Error testing timezone conversion:', error);
  }
}

// Run the test
testTimezoneConversion().then(() => {
  console.log('\n✅ Timezone conversion test complete');
  process.exit(0);
});
