const { ConfigDatabase } = require('./src/server/configDatabase');

console.log('🧹 Cleaning up session_events table to keep only 20 most recent events...');

try {
  const configDB = new ConfigDatabase();
  
  // Count events before cleanup
  const beforeCount = configDB.db.prepare("SELECT COUNT(*) as count FROM session_events").get();
  console.log(`📊 Events before cleanup: ${beforeCount.count}`);
  
  // Delete all but the most recent 20 events
  const cleanup = configDB.db.prepare(`
    DELETE FROM session_events 
    WHERE id NOT IN (
      SELECT id FROM session_events 
      ORDER BY event_time_utc DESC, id DESC 
      LIMIT 20
    )
  `);
  
  const result = cleanup.run();
  console.log(`🗑️  Deleted ${result.changes} old events`);
  
  // Count events after cleanup
  const afterCount = configDB.db.prepare("SELECT COUNT(*) as count FROM session_events").get();
  console.log(`📊 Events after cleanup: ${afterCount.count}`);
  
  // Show the remaining events
  const remainingEvents = configDB.db.prepare(`
    SELECT id, event_type, event_time_utc 
    FROM session_events 
    ORDER BY id DESC 
    LIMIT 10
  `).all();
  
  console.log('\n🕒 Most recent 10 events after cleanup:');
  remainingEvents.forEach((event, idx) => {
    console.log(`  ${idx + 1}. ID: ${event.id}, Type: ${event.event_type}, Time: ${event.event_time_utc}`);
  });
  
  configDB.close();
  console.log('✅ Database cleanup completed successfully!');
  
} catch (error) {
  console.error('❌ Error during cleanup:', error.message);
}
