const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'dashboard-config.sqlite');
console.log(`🔍 Checking database: ${dbPath}`);

try {
  const db = new Database(dbPath);
  
  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('\n📊 All tables in database:');
  tables.forEach(table => console.log(`  - ${table.name}`));
  
  // Check if session_state table exists
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='session_state'").get();
  console.log('\n📊 session_state table schema:');
  console.log(schema ? schema.sql : 'Table not found');
  
  if (schema) {
    // List all columns if table exists
    const columns = db.prepare("PRAGMA table_info(session_state)").all();
    console.log('\n📋 Columns in session_state:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
  }
  
  db.close();
} catch (error) {
  console.error('❌ Error:', error.message);
}
