const path = require('path');

async function debugSessionTimezone() {
  try {
    console.log('🔍 Debugging session timezone handling...\n');
    
    // Check current time in different formats
    const now = new Date();
    console.log('📅 Current times:');
    console.log(`   Local: ${now.toString()}`);
    console.log(`   UTC: ${now.toISOString()}`);
    console.log(`   Chicago (UTC-5): ${now.toLocaleString('en-US', { timeZone: 'America/Chicago' })}`);
    console.log();

    // Import and check NINA service
    const NINAService = require('../../src/services/ninaService');
    const { ConfigDatabase } = require('../../src/server/configDatabase');
    
    const configDb = new ConfigDatabase();
    const ninaService = new NINAService();
    
    console.log('📡 Fetching latest NINA event history...');
    const eventHistoryResponse = await ninaService.getEventHistory();
    
    const eventHistory = eventHistoryResponse.Response || [];
    
    if (!Array.isArray(eventHistory) || eventHistory.length === 0) {
      console.log('❌ No events array found');
      return;
    }
    
    console.log(`📊 Found ${eventHistory.length} events`);
    
    // Find the most recent target events
    const recentTargetEvents = eventHistory
      .filter(event => event.Event === 'TS-TARGETSTART' || event.Event === 'TS-NEWTARGETSTART')
      .slice(-3); // Last 3 target events
    
    console.log('\n🎯 Recent Target Events:');
    recentTargetEvents.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.Event}`);
      console.log(`      Time: ${event.Time}`);
      console.log(`      TargetName: ${event.TargetName}`);
      console.log(`      TargetEndTime: ${event.TargetEndTime}`);
      
      // Parse the timestamps
      const eventTime = new Date(event.Time);
      console.log(`      Parsed Event Time: ${eventTime.toISOString()} (UTC)`);
      console.log(`      Parsed Event Time (Chicago): ${eventTime.toLocaleString('en-US', { timeZone: 'America/Chicago' })}`);
      
      if (event.TargetEndTime) {
        // Try parsing TargetEndTime different ways
        console.log(`      Raw TargetEndTime: ${event.TargetEndTime}`);
        
        // Extract timezone from event.Time and apply to TargetEndTime
        const timezoneMatch = event.Time.match(/([+-]\d{2}:\d{2})$/);
        if (timezoneMatch) {
          const timezoneOffset = timezoneMatch[1];
          const targetEndTimeWithTz = new Date(event.TargetEndTime + timezoneOffset);
          console.log(`      TargetEndTime with TZ: ${targetEndTimeWithTz.toISOString()} (UTC)`);
          console.log(`      TargetEndTime (Chicago): ${targetEndTimeWithTz.toLocaleString('en-US', { timeZone: 'America/Chicago' })}`);
          
          // Check if session should still be active
          const isActive = now < targetEndTimeWithTz;
          console.log(`      📊 Is Active? ${isActive ? '✅ YES' : '❌ NO'} (${targetEndTimeWithTz.getTime() - now.getTime()}ms ${isActive ? 'remaining' : 'ago'})`);
        } else {
          console.log('      ⚠️ No timezone found in event time');
        }
      } else {
        console.log('      ⚠️ No TargetEndTime provided');
      }
      console.log();
    });
    
    // Check for recent imaging activity
    const recentImageEvents = eventHistory
      .filter(event => event.Event === 'IMAGE-SAVE')
      .slice(-5);
    
    console.log('📸 Recent Image Events:');
    recentImageEvents.forEach((event, index) => {
      const eventTime = new Date(event.Time);
      const minutesAgo = (now.getTime() - eventTime.getTime()) / (1000 * 60);
      console.log(`   ${index + 1}. ${event.Time} (${minutesAgo.toFixed(1)} minutes ago)`);
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugSessionTimezone();
