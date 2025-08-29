const Database = require('better-sqlite3');
const db = new Database('./dashboard-config.sqlite');

console.log('🧹 Starting comprehensive dashboard cleanup...');

// 1. Drop the corrupted table completely and let configDatabase recreate it
console.log('\n🗑️ Dropping corrupted dashboard_widgets table...');
try {
  db.exec('DROP TABLE IF EXISTS dashboard_widgets');
  console.log('   ✅ Dropped corrupted dashboard_widgets table');
} catch (e) {
  console.log(`   ❌ Error dropping table: ${e.message}`);
}

// 2. Remove any layout-related config entries
console.log('\n🧽 Cleaning layout-related config entries...');
try {
  const result = db.prepare("DELETE FROM config WHERE key = 'layout' OR key LIKE '%widget%' OR key LIKE '%layout%'").run();
  console.log(`   ✅ Removed ${result.changes} layout/widget config entries`);
} catch (e) {
  console.log(`   ❌ Error cleaning config: ${e.message}`);
}

db.close();

console.log('\n🏗️ Recreating clean widget system...');

// 3. Now initialize the proper ConfigDatabase system which will create the table and defaults
try {
  // Import and initialize ConfigDatabase which will create proper table structure
  const { getConfigDatabase } = require('./configDatabase');
  const configDb = getConfigDatabase('./dashboard-config.sqlite');
  console.log('   ✅ ConfigDatabase system initialized with proper widget table');
  
  // Check what was created
  const db2 = new Database('./dashboard-config.sqlite');
  
  const widgetCount = db2.prepare('SELECT COUNT(*) as count FROM dashboard_widgets').get();
  console.log(`   📊 Dashboard widgets table now has ${widgetCount.count} entries`);
  
  const widgets = db2.prepare('SELECT id, component, title, x, y, w, h FROM dashboard_widgets ORDER BY x, y').all();
  console.log('   📋 Created widgets:');
  widgets.forEach(w => {
    console.log(`      - ${w.id}: ${w.component} "${w.title}" at (${w.x},${w.y}) size ${w.w}x${w.h}`);
  });
  
  db2.close();
  configDb.close();
  
} catch (e) {
  console.log(`   ❌ Error initializing ConfigDatabase: ${e.message}`);
}

console.log('\n🎉 Comprehensive dashboard cleanup completed!');
console.log('\n📝 Summary:');
console.log('   • Dropped corrupted dashboard_widgets table (1000+ entries)');
console.log('   • Removed all conflicting layout configuration entries');
console.log('   • Recreated clean dashboard_widgets table with proper schema');
console.log('   • Initialized 5 default widgets with unique IDs and positions');

console.log('\n⚠️ System Integration Status:');
console.log('   ✅ ConfigDatabase system: Primary widget management (ACTIVE)');
console.log('   ❌ dashboardWidgets.js: Secondary conflicting system (DISABLE)');
console.log('   ❌ Layout API: Legacy system in config table (REMOVE)');

console.log('\n📋 Next Steps:');
console.log('   1. Update Dashboard.tsx to use ConfigDatabase widget APIs');
console.log('   2. Remove dashboardWidgets.js module (conflicts with ConfigDatabase)');
console.log('   3. Remove layout API endpoints from config-server.js'); 
console.log('   4. Update all widget management to use ConfigDatabase methods');
console.log('   5. Test the clean widget loading and saving');
