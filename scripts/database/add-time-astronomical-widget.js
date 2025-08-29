#!/usr/bin/env node

/**
 * Add Time & Astronomy Widget to Existing Database
 * This script adds the TimeAstronomicalWidget to existing dashboard databases
 * Run this if you already have a dashboard-config.sqlite file and want to add the new widget
 */

const path = require('path');
const { ConfigDatabase } = require('../../src/server/configDatabase');

async function addTimeAstronomicalWidget() {
  console.log('🌙 Adding Time & Astronomy Widget to Database...\n');

  // Connect to the database in the server directory
  const dbPath = path.join(process.cwd(), 'src', 'server', 'dashboard-config.sqlite');
  console.log(`📍 Database path: ${dbPath}`);
  const configDb = new ConfigDatabase(dbPath);

  try {
    // Check if the widget already exists
    const existingWidget = configDb.getWidget('time-astronomical');
    
    if (existingWidget) {
      console.log('✅ TimeAstronomicalWidget already exists in database!');
      console.log(`   Current position: x=${existingWidget.x}, y=${existingWidget.y}, size=${existingWidget.w}x${existingWidget.h}`);
      return;
    }

    // Add the new widget
    const timeAstronomicalWidget = {
      id: 'time-astronomical',
      component: 'TimeAstronomicalWidget',
      title: 'Time & Astronomy',
      x: 8,
      y: 8,
      w: 4,
      h: 6,
      minW: 3,
      minH: 4
    };

    configDb.addWidget(timeAstronomicalWidget);
    console.log('✅ Successfully added TimeAstronomicalWidget to database!');
    console.log(`   Position: x=${timeAstronomicalWidget.x}, y=${timeAstronomicalWidget.y}`);
    console.log(`   Size: ${timeAstronomicalWidget.w}x${timeAstronomicalWidget.h} (min: ${timeAstronomicalWidget.minW}x${timeAstronomicalWidget.minH})`);
    
    // Verify the addition
    const widgets = configDb.getWidgets();
    console.log(`\n📊 Total widgets now in database: ${widgets.length}`);
    
    widgets.forEach(widget => {
      console.log(`   • ${widget.title} (${widget.component}) at ${widget.layout.x},${widget.layout.y}`);
    });

  } catch (error) {
    console.error('❌ Error adding widget:', error.message);
    process.exit(1);
  } finally {
    configDb.close();
  }

  console.log('\n🎉 Database update complete!');
  console.log('💡 Restart your development server to see the new widget');
}

// Run the script if called directly
if (require.main === module) {
  addTimeAstronomicalWidget().catch(console.error);
}

module.exports = { addTimeAstronomicalWidget };
