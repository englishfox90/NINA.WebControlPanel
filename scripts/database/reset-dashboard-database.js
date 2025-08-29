#!/usr/bin/env node

/**
 * Reset Dashboard Database
 * This script completely resets the dashboard-config.sqlite database
 * WARNING: This will delete all custom widget positions and configurations!
 */

const fs = require('fs');
const path = require('path');
const { ConfigDatabase } = require('../../src/server/configDatabase');

async function resetDashboardDatabase() {
  console.log('⚠️  RESET DASHBOARD DATABASE\n');

  const dbPath = path.join(process.cwd(), 'src', 'server', 'dashboard-config.sqlite');
  console.log(`📍 Database path: ${dbPath}`);

  // Check if database exists
  if (fs.existsSync(dbPath)) {
    console.log(`📄 Found existing database: ${dbPath}`);
    
    // Ask for confirmation (in a real scenario, you might want to add readline for interactive confirmation)
    console.log('⚠️  WARNING: This will delete all your custom widget configurations!');
    console.log('   To proceed, delete the database file manually and restart the server.');
    console.log('\n💡 Alternative: Use the add-time-astronomical-widget.js script to add just the missing widget.');
    
    // Show what would be reset
    try {
      const configDb = new ConfigDatabase(dbPath);
      const widgets = configDb.getWidgets();
      console.log(`\n📊 Current widgets that would be reset:`);
      widgets.forEach(widget => {
        console.log(`   • ${widget.title} (${widget.component})`);
      });
      configDb.close();
    } catch (error) {
      console.log('   (Could not read current database)');
    }
    
    return;
  }

  console.log('✅ No existing database found. A new one with the TimeAstronomicalWidget will be created automatically.');
  console.log('💡 Just restart your development server to create a fresh database.');
}

// Run the script if called directly
if (require.main === module) {
  resetDashboardDatabase().catch(console.error);
}

module.exports = { resetDashboardDatabase };
