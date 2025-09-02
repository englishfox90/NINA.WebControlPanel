// Fix the Target Scheduler database path in configuration
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'src', 'server', 'dashboard-config.sqlite');
const db = new Database(dbPath);

console.log('🔧 Fixing Target Scheduler database path...');

// Update the scheduler database path to the correct location
const updateStmt = db.prepare(`
  INSERT OR REPLACE INTO config (key, value, category) 
  VALUES ('database.targetSchedulerPath', ?, 'database')
`);

const correctPath = path.join(process.cwd(), 'resources', 'schedulerdb.sqlite');
// Store as JSON string since the config system expects JSON
updateStmt.run(JSON.stringify(correctPath));

console.log('✅ Updated scheduler database path to:', correctPath);

// Verify the update
const config = db.prepare('SELECT * FROM config WHERE key = ?').get('database.targetSchedulerPath');
console.log('📋 Current config:', config);

db.close();
console.log('🎯 Configuration update complete!');
