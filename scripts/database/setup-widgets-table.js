// Script to set up the dashboard_widgets table
const { ConfigDatabase } = require('./configDatabase');

const db = new ConfigDatabase();
console.log('Database initialized with new widgets table structure');

// Check if widgets were created
const widgets = db.getWidgets();
console.log('Current widgets:', JSON.stringify(widgets, null, 2));

db.close();
console.log('Setup complete!');
