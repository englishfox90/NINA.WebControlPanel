// Add Guider Graph Widget to dashboard configuration
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'src', 'server', 'dashboard-config.sqlite');
const db = new Database(dbPath);

console.log('🎯 Adding Guider Graph Widget to dashboard...');
console.log('📍 Database path:', dbPath);

// Check if widget already exists
const existingWidget = db.prepare('SELECT * FROM dashboard_widgets WHERE id = ?').get('guider-graph');

if (existingWidget) {
  console.log('⚠️ Guider Graph Widget already exists in database');
  console.log('Current configuration:', existingWidget);
  
  // Update existing widget if needed
  const updateStmt = db.prepare(`
    UPDATE dashboard_widgets 
    SET component = 'GuiderGraphWidget', 
        title = 'Guider Graph',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'guider-graph'
  `);
  
  const result = updateStmt.run();
  console.log(`✅ Updated existing widget (${result.changes} rows affected)`);
  
} else {
  // Find a good position for the new widget
  const existingWidgets = db.prepare('SELECT x, y, w, h FROM dashboard_widgets ORDER BY x, y').all();
  console.log('Existing widgets positions:', existingWidgets);
  
  // Place it at position (8, 8) - below the scheduler widget with standard size
  const insertStmt = db.prepare(`
    INSERT INTO dashboard_widgets (id, component, title, x, y, w, h, minW, minH, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const widgetConfig = {
    id: 'guider-graph',
    component: 'GuiderGraphWidget',
    title: 'Guider Graph',
    x: 8,           // Right side of dashboard
    y: 8,           // Below main widgets
    w: 6,           // 6 grid units wide
    h: 8,           // 8 grid units tall
    minW: 4,        // Minimum 4 units wide
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
  
  console.log('✅ Guider Graph Widget added successfully!');
  console.log('Widget configuration:', widgetConfig);
}

// Verify the addition
const allWidgets = db.prepare('SELECT * FROM dashboard_widgets ORDER BY x, y').all();
console.log('\n📋 Current dashboard widgets:');
allWidgets.forEach(widget => {
  console.log(`- ${widget.title} (${widget.component}) at [${widget.x},${widget.y}] size ${widget.w}x${widget.h} ${widget.enabled ? '✅' : '❌'}`);
});

// Check if the new widget is there
const guiderWidget = db.prepare('SELECT * FROM dashboard_widgets WHERE component = ?').get('GuiderGraphWidget');
if (guiderWidget) {
  console.log('\n🎯 Guider Graph Widget successfully configured:');
  console.log(`   ID: ${guiderWidget.id}`);
  console.log(`   Position: [${guiderWidget.x}, ${guiderWidget.y}]`);
  console.log(`   Size: ${guiderWidget.w}x${guiderWidget.h}`);
  console.log(`   Enabled: ${guiderWidget.enabled ? 'Yes' : 'No'}`);
  console.log(`   Created: ${guiderWidget.created_at}`);
}

db.close();
console.log('\n✨ Database update complete!');
console.log('🚀 The Guider Graph Widget will appear on next dashboard load.');
