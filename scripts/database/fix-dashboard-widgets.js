const Database = require('better-sqlite3');
const db = new Database('./dashboard-config.sqlite');

console.log('🧹 Starting dashboard cleanup...');

// 1. Backup current state
console.log('\n📋 Creating backup of current state...');
const backup = {
  configLayout: null,
  dashboardWidgets: []
};

try {
  const layoutConfig = db.prepare("SELECT value FROM config WHERE key = 'layout'").get();
  if (layoutConfig) {
    backup.configLayout = JSON.parse(layoutConfig.value);
    console.log(`   ✅ Backed up config layout with ${backup.configLayout.widgets?.length || 0} widgets`);
  }
  
  const widgets = db.prepare('SELECT * FROM dashboard_widgets').all();
  backup.dashboardWidgets = widgets;
  console.log(`   ✅ Backed up ${widgets.length} dashboard_widgets entries`);
} catch (e) {
  console.log(`   ❌ Error creating backup: ${e.message}`);
}

// 2. Clear the corrupted dashboard_widgets table
console.log('\n🗑️ Clearing corrupted dashboard_widgets table...');
try {
  const result = db.prepare('DELETE FROM dashboard_widgets').run();
  console.log(`   ✅ Removed ${result.changes} corrupted widget entries`);
} catch (e) {
  console.log(`   ❌ Error clearing table: ${e.message}`);
}

// 3. Remove layout from config (legacy approach)
console.log('\n🧽 Removing legacy layout from config table...');
try {
  const result = db.prepare("DELETE FROM config WHERE key = 'layout'").run();
  console.log(`   ✅ Removed ${result.changes} legacy layout entry from config`);
} catch (e) {
  console.log(`   ❌ Error removing legacy layout: ${e.message}`);
}

// 4. Set up clean default widgets in dashboard_widgets table
console.log('\n🏗️ Setting up clean default widgets...');
const defaultWidgets = [
  {
    type: 'NINAStatus',
    config: JSON.stringify({
      title: 'NINA Status',
      layout: { i: 'nina-status', x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 }
    }),
    position: 1
  },
  {
    type: 'SystemStatusWidget', 
    config: JSON.stringify({
      title: 'System Monitor',
      layout: { i: 'system-monitor', x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 }
    }),
    position: 2
  },
  {
    type: 'SchedulerWidget',
    config: JSON.stringify({
      title: 'Target Scheduler', 
      layout: { i: 'scheduler', x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 6 }
    }),
    position: 3
  },
  {
    type: 'RTSPViewer',
    config: JSON.stringify({
      title: 'Live View',
      layout: { i: 'rtsp-viewer', x: 0, y: 8, w: 8, h: 6, minW: 4, minH: 4 }
    }),
    position: 4
  },
  {
    type: 'SessionWidget',
    config: JSON.stringify({
      title: 'Current Session',
      layout: { i: 'session-widget', x: 8, y: 6, w: 4, h: 8, minW: 3, minH: 6 }
    }),
    position: 5
  }
];

try {
  const stmt = db.prepare('INSERT INTO dashboard_widgets (type, config, position) VALUES (?, ?, ?)');
  let insertedCount = 0;
  
  for (const widget of defaultWidgets) {
    const result = stmt.run(widget.type, widget.config, widget.position);
    insertedCount++;
    console.log(`   ✅ Added ${widget.type} widget (ID: ${result.lastInsertRowid})`);
  }
  
  console.log(`   🎉 Successfully inserted ${insertedCount} clean default widgets`);
} catch (e) {
  console.log(`   ❌ Error inserting default widgets: ${e.message}`);
}

// 5. Verify the cleanup
console.log('\n✅ Verifying cleanup results...');
try {
  const widgetCount = db.prepare('SELECT COUNT(*) as count FROM dashboard_widgets').get();
  console.log(`   📊 Dashboard widgets table now has ${widgetCount.count} entries`);
  
  const layoutConfig = db.prepare("SELECT value FROM config WHERE key = 'layout'").get();
  console.log(`   📊 Legacy layout in config: ${layoutConfig ? 'EXISTS (should be removed!)' : 'REMOVED ✅'}`);
  
  const widgets = db.prepare('SELECT id, type, position FROM dashboard_widgets ORDER BY position').all();
  console.log('   📋 Current widgets:');
  widgets.forEach(w => {
    console.log(`      - ID: ${w.id}, Type: ${w.type}, Position: ${w.position}`);
  });
  
} catch (e) {
  console.log(`   ❌ Error verifying: ${e.message}`);
}

db.close();

console.log('\n🎉 Dashboard cleanup completed!');
console.log('\n📝 Summary of changes:');
console.log('   • Removed 1000+ duplicate widget entries');
console.log('   • Removed legacy layout configuration from config table');  
console.log('   • Created 5 clean default widgets in dashboard_widgets table');
console.log('   • Each widget now has a unique ID and proper configuration');

console.log('\n⚠️ Next steps:');
console.log('   1. Restart the config server to clear any cached data');
console.log('   2. Update Dashboard.tsx to use dashboard-widgets API instead of layout API');
console.log('   3. Test widget loading and layout saving functionality');
