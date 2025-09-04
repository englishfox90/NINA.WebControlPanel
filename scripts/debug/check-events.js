const { ConfigDatabase } = require('./src/server/configDatabase');

console.log('🔍 Checking session_events table...');

try {
  const configDB = new ConfigDatabase();
  
  // Count total events
  const totalCount = configDB.db.prepare("SELECT COUNT(*) as count FROM session_events").get();
  console.log(`📊 Total events in database: ${totalCount.count}`);
  
  // Show most recent 10 events
  const recentEvents = configDB.db.prepare(`
    SELECT id, event_type, event_time_utc 
    FROM session_events 
    ORDER BY id DESC 
    LIMIT 10
  `).all();
  
  console.log('\n🕒 Most recent 10 events:');
  recentEvents.forEach((event, idx) => {
    console.log(`  ${idx + 1}. ID: ${event.id}, Type: ${event.event_type}, Time: ${event.event_time_utc}`);
  });
  
  configDB.close();
} catch (error) {
  console.error('❌ Error:', error.message);
}
