#!/usr/bin/env node
/**
 * Fix Session Schema - Drop and recreate session tables with correct structure
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'src', 'server', 'dashboard-config.sqlite');

console.log('🗄️ Opening database:', dbPath);
const db = new Database(dbPath);

try {
  console.log('🗑️ Dropping existing session tables...');
  
  // Drop existing tables
  db.exec(`
    DROP TABLE IF EXISTS session_events;
    DROP TABLE IF EXISTS session_state;
    DROP TABLE IF EXISTS sessions;
  `);

  console.log('🔧 Creating new session tables...');
  
  // Sessions table - tracks individual imaging sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_uuid TEXT UNIQUE NOT NULL,
      target_name TEXT,
      project_name TEXT,
      coordinates_ra REAL,
      coordinates_dec REAL,
      coordinates_ra_string TEXT,
      coordinates_dec_string TEXT,
      rotation INTEGER,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      target_end_time TEXT,
      is_active BOOLEAN DEFAULT 1,
      is_expired BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_uuid ON sessions(session_uuid);
    CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
  `);

  // Session events table - recent events only (no foreign key)
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_uuid TEXT,
      event_type TEXT NOT NULL,
      event_time_utc TEXT NOT NULL,
      event_data TEXT,
      is_processed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_events_session ON session_events(session_uuid);
    CREATE INDEX IF NOT EXISTS idx_events_type ON session_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_time ON session_events(event_time_utc);
    CREATE INDEX IF NOT EXISTS idx_events_processed ON session_events(is_processed);
  `);

  // Session state table - current state snapshot (no foreign key, fixed column names)
  db.exec(`
    CREATE TABLE IF NOT EXISTS session_state (
      id INTEGER PRIMARY KEY,
      current_session_uuid TEXT,
      target_name TEXT,
      project_name TEXT,
      coordinates TEXT,
      rotation INTEGER,
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
      flats_brightness INTEGER,
      flats_count INTEGER DEFAULT 0,
      flats_started_at TEXT,
      flats_last_image_at TEXT,
      darks_active BOOLEAN DEFAULT 0,
      darks_exposure_time INTEGER,
      darks_exposure_groups TEXT,
      darks_total_images INTEGER DEFAULT 0,
      darks_started_at TEXT,
      darks_last_image_at TEXT,
      is_guiding BOOLEAN DEFAULT 0,
      session_start TEXT,
      is_session_active BOOLEAN DEFAULT 0,
      last_update TEXT,
      recent_events TEXT,
      event_count INTEGER DEFAULT 0,
      connection_status BOOLEAN DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO session_state (id) VALUES (1);
  `);

  console.log('✅ Session schema fixed successfully');
  console.log('📊 Verifying tables...');
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'session%'").all();
  tables.forEach(table => {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`   📋 ${table.name}: ${count.count} rows`);
  });

} catch (error) {
  console.error('❌ Error fixing session schema:', error);
} finally {
  db.close();
  console.log('🔒 Database connection closed');
}
