// Script to check table structure
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'dashboard-config.sqlite');
const db = new Database(dbPath);

console.log('Checking table structure...');

// Check structure of dashboard_widgets table
const tableInfo = db.prepare("PRAGMA table_info(dashboard_widgets)").all();
console.log('dashboard_widgets columns:', tableInfo);

// Drop and recreate the table with correct structure
console.log('Dropping and recreating table...');

db.exec(`
  DROP TABLE IF EXISTS dashboard_widgets;
  
  CREATE TABLE dashboard_widgets (
    id TEXT PRIMARY KEY,
    component TEXT NOT NULL,
    title TEXT NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    w INTEGER NOT NULL,
    h INTEGER NOT NULL,
    minW INTEGER DEFAULT 2,
    minH INTEGER DEFAULT 2,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TRIGGER update_widgets_timestamp 
  AFTER UPDATE ON dashboard_widgets
  BEGIN
    UPDATE dashboard_widgets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
`);

// Insert default widgets including SessionWidget
const stmt = db.prepare(`
  INSERT INTO dashboard_widgets (id, component, title, x, y, w, h, minW, minH)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const defaultWidgets = [
  { id: 'nina-status', component: 'NINAStatus', title: 'NINA Status', x: 0, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
  { id: 'system-monitor', component: 'SystemStatusWidget', title: 'System Monitor', x: 4, y: 0, w: 4, h: 6, minW: 3, minH: 4 },
  { id: 'scheduler', component: 'SchedulerWidget', title: 'Target Scheduler', x: 8, y: 0, w: 4, h: 8, minW: 3, minH: 6 },
  { id: 'rtsp-viewer', component: 'RTSPViewer', title: 'Live View', x: 0, y: 8, w: 8, h: 6, minW: 4, minH: 4 },
  { id: 'session-widget', component: 'SessionWidget', title: 'Current Session', x: 12, y: 0, w: 4, h: 15, minW: 3, minH: 10 },
  { id: 'guider-graph', component: 'GuiderGraphWidget', title: 'Guider Graph', x: 8, y: 8, w: 6, h: 8, minW: 4, minH: 6 }
];

const transaction = db.transaction((widgets) => {
  for (const widget of widgets) {
    stmt.run(widget.id, widget.component, widget.title, widget.x, widget.y, widget.w, widget.h, widget.minW, widget.minH);
  }
});

transaction(defaultWidgets);

// Verify the widgets
const widgets = db.prepare('SELECT * FROM dashboard_widgets ORDER BY x, y').all();
console.log('\nWidgets successfully created:');
widgets.forEach(widget => {
  console.log(`- ${widget.title} (${widget.component}) at [${widget.x},${widget.y}] size ${widget.w}x${widget.h}`);
});

db.close();
console.log('\nDatabase setup complete!');
