// Add Unified State Widget to dashboard configuration
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'src', 'server', 'dashboard-config.sqlite');
const db = new Database(dbPath);

console.log('🎯 Adding Unified State Widget to dashboard...');
console.log('📍 Database path:', dbPath);

// Check if widget already exists
const existingWidget = db.prepare('SELECT * FROM dashboard_widgets WHERE id = ?').get('unified-state');

if (existingWidget) {
  console.log('⚠️ Unified State Widget already exists in database');
  console.log('Current configuration:', existingWidget);
  
  // Update existing widget to ensure it's enabled
  const updateStmt = db.prepare(`
    UPDATE dashboard_widgets 
    SET component = 'UnifiedStateWidget', 
        title = 'Unified State',
        enabled = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'unified-state'
  `);
  
  const result = updateStmt.run();
  console.log(`✅ Updated existing widget (${result.changes} rows affected)`);
  
} else {
  // Find a good position for the new widget
  const existingWidgets = db.prepare('SELECT x, y, w, h FROM dashboard_widgets ORDER BY x, y').all();
  console.log('Existing widgets positions:', existingWidgets);
  
  // Place it at position (0, 14) - below other widgets on the left side
  const insertStmt = db.prepare(`
    INSERT INTO dashboard_widgets (id, component, title, x, y, w, h, minW, minH, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const widgetConfig = {
    id: 'unified-state',
    component: 'UnifiedStateWidget',
    title: 'Unified State',
    x: 0,           // Left side of dashboard
    y: 14,          // Below main widgets
    w: 4,           // 4 grid units wide (compact)
    h: 10,          // 10 grid units tall (shows session + events)
    minW: 3,        // Minimum 3 units wide
    minH: 6,        // Minimum 6 units tall
    enabled: true
  };
  
  insertStmt.run(
    widgetConfig.id,
    widgetConfig.component,
    widgetConfig.title,
    widgetConfig.x,
    widgetConfig.y,
    widgetConfig.w,
    widgetConfig.h,
    widgetConfig.minW,
    widgetConfig.minH,
    widgetConfig.enabled ? 1 : 0  // Convert boolean to integer
  );
  
  console.log('✅ Unified State Widget added successfully!');
  console.log('Widget configuration:', widgetConfig);
}

// Verify the addition
const allWidgets = db.prepare('SELECT * FROM dashboard_widgets ORDER BY x, y').all();
console.log('\n📋 Current dashboard widgets:');
allWidgets.forEach(widget => {
  console.log(`- ${widget.title} (${widget.component}) at [${widget.x},${widget.y}] size ${widget.w}x${widget.h} ${widget.enabled ? '✅' : '❌'}`);
});

// Check if the new widget is there
const unifiedStateWidget = db.prepare('SELECT * FROM dashboard_widgets WHERE component = ?').get('UnifiedStateWidget');
if (unifiedStateWidget) {
  console.log('\n🎯 Unified State Widget successfully configured:');
  console.log(`   ID: ${unifiedStateWidget.id}`);
  console.log(`   Position: [${unifiedStateWidget.x}, ${unifiedStateWidget.y}]`);
  console.log(`   Size: ${unifiedStateWidget.w}x${unifiedStateWidget.h}`);
  console.log(`   Enabled: ${unifiedStateWidget.enabled ? 'Yes' : 'No'}`);
  console.log(`   Created: ${unifiedStateWidget.created_at}`);
}

db.close();
console.log('\n✨ Database update complete!');
console.log('🚀 The Unified State Widget will appear on next dashboard load.');
