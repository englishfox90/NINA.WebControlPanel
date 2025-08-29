const Database = require('better-sqlite3');
const db = new Database('./dashboard-config.sqlite');
console.log('=== Dashboard Widgets Table Structure ===');
const schema = db.prepare('PRAGMA table_info(dashboard_widgets)').all();
schema.forEach(col => {
  console.log(`${col.name}: ${col.type} ${col.notnull ? '(NOT NULL)' : ''} ${col.dflt_value ? 'DEFAULT ' + col.dflt_value : ''}`);
});
db.close();
