const { ConfigDatabase } = require('./src/server/configDatabase');
const SessionSchema = require('./src/server/database/sessionSchema');

console.log('🔧 Testing database connection and table creation...');

try {
  // Initialize config database
  console.log('📊 Creating ConfigDatabase...');
  const configDB = new ConfigDatabase();
  
  console.log(`📊 Database path: ${configDB.dbPath}`);
  console.log(`📊 Database connection: ${configDB.db ? 'OK' : 'FAILED'}`);
  
  // Test SessionSchema initialization
  console.log('📋 Creating SessionSchema...');
  const sessionSchema = new SessionSchema(configDB.db);
  console.log('✅ SessionSchema created successfully');
  
  // Check if tables were created
  const tables = configDB.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('\n📊 Tables created:');
  tables.forEach(table => console.log(`  ✅ ${table.name}`));
  
  // Check session_state table specifically
  const sessionStateColumns = configDB.db.prepare("PRAGMA table_info(session_state)").all();
  console.log('\n📋 session_state columns:');
  sessionStateColumns.forEach(col => {
    console.log(`  - ${col.name} (${col.type})`);
  });
  
  // Test inserting data
  console.log('\n🧪 Testing updateState...');
  const testData = {
    target_name: 'Test Target',
    is_session_active: 1,
    last_update: new Date().toISOString()
  };
  
  sessionSchema.updateState(testData);
  console.log('✅ updateState test successful');
  
  configDB.close();
  console.log('✅ Test completed successfully');
  
} catch (error) {
  console.error('❌ Test failed:', error);
}
