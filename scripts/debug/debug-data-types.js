const Database = require('better-sqlite3');

// Create a test database and schema
const db = new Database(':memory:');

// Create the session_state table
db.exec(`
  CREATE TABLE session_state (
    id INTEGER PRIMARY KEY,
    current_session_uuid TEXT,
    target_name TEXT,
    project_name TEXT,
    coordinates TEXT,
    rotation REAL,
    current_filter TEXT,
    last_image_data TEXT,
    is_safe BOOLEAN,
    safety_time TEXT,
    activity_subsystem TEXT,
    activity_state TEXT,
    activity_since TEXT,
    last_equipment_change TEXT,
    flats_active BOOLEAN DEFAULT 0,
    flats_filter TEXT,
    flats_brightness REAL,
    flats_count INTEGER DEFAULT 0,
    flats_started_at TEXT,
    flats_last_image_at TEXT,
    darks_active BOOLEAN DEFAULT 0,
    darks_exposure_time REAL,
    darks_exposure_groups TEXT,
    darks_total_images INTEGER DEFAULT 0,
    darks_started_at TEXT,
    darks_last_image_at TEXT,
    session_start TEXT,
    is_session_active BOOLEAN DEFAULT 0,
    last_update TEXT,
    recent_events TEXT,
    event_count INTEGER DEFAULT 0,
    connection_status BOOLEAN DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Sample problematic data (based on the error)
const testData = {
  current_session_uuid: 'session_1756960144679',
  target_name: 'Barnard 160',
  project_name: null,
  coordinates: null,
  rotation: null,
  current_filter: null,
  last_image_data: null,
  is_safe: null,
  safety_time: null,
  activity_subsystem: null,
  activity_state: null,
  activity_since: null,
  last_equipment_change: null,
  flats_active: false,
  flats_filter: null,
  flats_brightness: null,
  flats_count: 0,
  flats_started_at: null,
  flats_last_image_at: null,
  darks_active: false,
  darks_exposure_time: null,
  darks_exposure_groups: null,
  darks_total_images: 0,
  darks_started_at: null,
  darks_last_image_at: null,
  session_start: '2025-09-04T09:21:10.334Z',
  is_session_active: true,
  last_update: new Date().toISOString()
};

console.log('Testing data types:');
for (const [key, value] of Object.entries(testData)) {
  const type = typeof value;
  const isValid = ['string', 'number', 'bigint', 'boolean'].includes(type) || value === null;
  console.log(`${key}: ${value} (${type}) - ${isValid ? '✅' : '❌'}`);
}

// Try to insert the data
try {
  const fields = Object.keys(testData).join(', ');
  const placeholders = Object.keys(testData).map(key => `@${key}`).join(', ');
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO session_state (id, ${fields})
    VALUES (1, ${placeholders})
  `);
  
  const result = stmt.run(testData);
  console.log('\n✅ Data insertion successful:', result);
} catch (error) {
  console.error('\n❌ Data insertion failed:', error.message);
}

db.close();
