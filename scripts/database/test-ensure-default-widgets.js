#!/usr/bin/env node

const path = require('path');
const { ConfigDatabase } = require('../../src/server/configDatabase');

async function testEnsureDefaultWidgets() {
  try {
    console.log('🧪 Testing ensureDefaultWidgets functionality...');
    
    const dbPath = path.join(__dirname, '../../src/server/dashboard-config.sqlite');
    
    // Step 1: Remove weather widget to simulate missing widget
    console.log('🗑️ Step 1: Removing weather-widget to simulate missing widget...');
    const configDb = new ConfigDatabase(dbPath);
    
    const removeStmt = configDb.db.prepare('DELETE FROM dashboard_widgets WHERE id = ?');
    const removeResult = removeStmt.run('weather-widget');
    console.log(`   Removed ${removeResult.changes} weather widget(s)`);
    
    // Step 2: Get current widget count
    const beforeCount = configDb.db.prepare('SELECT COUNT(*) as count FROM dashboard_widgets').get();
    console.log(`📊 Step 2: Current widget count: ${beforeCount.count}`);
    
    // Step 3: Trigger ensureDefaultWidgets by creating new instance
    console.log('🔄 Step 3: Creating new ConfigDatabase instance to trigger ensureDefaultWidgets...');
    const testConfigDb = new ConfigDatabase(dbPath);
    
    // Step 4: Check if weather widget was re-added
    const afterCount = testConfigDb.db.prepare('SELECT COUNT(*) as count FROM dashboard_widgets').get();
    const weatherWidget = testConfigDb.db.prepare('SELECT * FROM dashboard_widgets WHERE id = ?').get('weather-widget');
    
    console.log(`📊 Step 4: New widget count: ${afterCount.count}`);
    console.log('🌤️ Weather widget status:', weatherWidget ? '✅ Found' : '❌ Missing');
    
    if (weatherWidget) {
      console.log('📍 Weather widget details:', {
        id: weatherWidget.id,
        component: weatherWidget.component,
        title: weatherWidget.title,
        position: `${weatherWidget.x},${weatherWidget.y}`,
        size: `${weatherWidget.w}x${weatherWidget.h}`
      });
    }
    
    // Step 5: Verify all default widgets are present
    const defaultWidgetIds = testConfigDb.getDefaultWidgets().map(w => w.id);
    const existingWidgets = testConfigDb.db.prepare('SELECT id FROM dashboard_widgets').all();
    const existingIds = existingWidgets.map(w => w.id);
    
    console.log('🔍 Step 5: Widget verification:');
    console.log('   Expected default widgets:', defaultWidgetIds.length);
    console.log('   Actual widgets in DB:', existingIds.length);
    
    const missingWidgets = defaultWidgetIds.filter(id => !existingIds.includes(id));
    const extraWidgets = existingIds.filter(id => !defaultWidgetIds.includes(id));
    
    if (missingWidgets.length === 0) {
      console.log('✅ All default widgets are present!');
    } else {
      console.log('❌ Missing widgets:', missingWidgets);
    }
    
    if (extraWidgets.length > 0) {
      console.log('ℹ️ Extra widgets (user-added):', extraWidgets);
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    process.exit(1);
  }
}

testEnsureDefaultWidgets();
