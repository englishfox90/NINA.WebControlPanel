// SQLite dashboard widgets table and API logic
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'dashboard-config.sqlite');
const db = new Database(dbPath);

// Create widgets table if not exists
function initWidgetsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dashboard_widgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      config TEXT,
      position INTEGER NOT NULL
    );
  `);
}

initWidgetsTable();

function getWidgets() {
  return db.prepare('SELECT * FROM dashboard_widgets ORDER BY position ASC').all();
}

function addWidget(type, config, position) {
  const stmt = db.prepare('INSERT INTO dashboard_widgets (type, config, position) VALUES (?, ?, ?)');
  return stmt.run(type, JSON.stringify(config || {}), position);
}

function updateWidgetPosition(id, position) {
  const stmt = db.prepare('UPDATE dashboard_widgets SET position = ? WHERE id = ?');
  return stmt.run(position, id);
}

function updateWidgetConfig(id, config) {
  const stmt = db.prepare('UPDATE dashboard_widgets SET config = ? WHERE id = ?');
  return stmt.run(JSON.stringify(config), id);
}

function removeWidget(id) {
  const stmt = db.prepare('DELETE FROM dashboard_widgets WHERE id = ?');
  return stmt.run(id);
}

function setWidgetOrder(widgetOrder) {
  const transaction = db.transaction(() => {
    widgetOrder.forEach(({ id, position }) => {
      updateWidgetPosition(id, position);
    });
  });
  transaction();
}

module.exports = {
  getWidgets,
  addWidget,
  updateWidgetPosition,
  updateWidgetConfig,
  removeWidget,
  setWidgetOrder
};
