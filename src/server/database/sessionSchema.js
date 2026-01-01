// Session Database Schema
// Manages session data structure in SQLite dashboard-config.sqlite

const Database = require('better-sqlite3');

class SessionSchema {
  constructor(db) {
    this.db = db;
    this.initializeTables();
  }

  initializeTables() {
    // Check if sessions table exists and has correct schema
    const tableInfo = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get();

    if (tableInfo) {
      // Check if session_uuid column exists
      const columns = this.db.prepare("PRAGMA table_info(sessions)").all();
      const hasSessionUuid = columns.some(col => col.name === 'session_uuid');

      if (!hasSessionUuid) {
        console.log('⚠️ Old sessions table schema detected, recreating...');
        this.db.exec('DROP TABLE IF EXISTS sessions');
      }
    }

    // Sessions table - tracks individual imaging sessions
    this.db.exec(`
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

    // Session events table - recent NINA events only (rolling window)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_uuid TEXT,
        event_type TEXT NOT NULL,
        event_time_utc TEXT NOT NULL,
        event_data TEXT, -- JSON blob
        is_processed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_events_session ON session_events(session_uuid);
      CREATE INDEX IF NOT EXISTS idx_events_type ON session_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_time ON session_events(event_time_utc);
      CREATE INDEX IF NOT EXISTS idx_events_processed ON session_events(is_processed);
    `);

    // Session state table - current state snapshot
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_state (
        id INTEGER PRIMARY KEY,
        current_session_uuid TEXT,
        target_name TEXT,
        project_name TEXT,
        coordinates TEXT, -- JSON
        rotation INTEGER,
        current_filter TEXT,
        last_image_data TEXT, -- JSON
        is_safe BOOLEAN,
        safety_time TEXT,
        activity_subsystem TEXT,
        activity_state TEXT,
        activity_since TEXT,
        last_equipment_change TEXT, -- JSON
        flats_active BOOLEAN DEFAULT 0,
        flats_filter TEXT,
        flats_brightness INTEGER,
        flats_count INTEGER DEFAULT 0,
        flats_started_at TEXT,
        flats_last_image_at TEXT,
        darks_active BOOLEAN DEFAULT 0,
        darks_exposure_time INTEGER,
        darks_exposure_groups TEXT, -- JSON - Fixed column name
        darks_total_images INTEGER DEFAULT 0,
        darks_started_at TEXT,
        darks_last_image_at TEXT,
        is_guiding BOOLEAN DEFAULT 0,
        session_start TEXT,
        is_session_active BOOLEAN DEFAULT 0,
        last_update TEXT,
        recent_events TEXT, -- JSON array of last 5 events
        event_count INTEGER DEFAULT 0,
        connection_status BOOLEAN DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Ensure only one row in session_state (singleton pattern)
      INSERT OR IGNORE INTO session_state (id) VALUES (1);
    `);

    // Create update trigger for sessions
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_sessions_timestamp 
      AFTER UPDATE ON sessions
      BEGIN
        UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    // Create update trigger for session_state
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS update_session_state_timestamp 
      AFTER UPDATE ON session_state
      BEGIN
        UPDATE session_state SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `);

    console.log('✅ Session database schema initialized');
  }

  // Get current session state
  getCurrentState() {
    const stmt = this.db.prepare('SELECT * FROM session_state WHERE id = 1');
    return stmt.get();
  }

  // Update session state
  updateState(stateData) {
    const fields = Object.keys(stateData).join(', ');
    const placeholders = Object.keys(stateData).map(key => `@${key}`).join(', ');

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO session_state (id, ${fields})
      VALUES (1, ${placeholders})
    `);

    return stmt.run(stateData);
  }

  // Add session event
  addEvent(sessionUuid, eventType, eventTimeUtc, eventData = null) {
    const stmt = this.db.prepare(`
      INSERT INTO session_events (session_uuid, event_type, event_time_utc, event_data)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(sessionUuid, eventType, eventTimeUtc, JSON.stringify(eventData));

    // Keep only the most recent 100 events (rolling window)
    this.cleanOldEvents(20);

    return result;
  }

  // Clean old events, keeping only the most recent N events
  cleanOldEvents(maxEvents = 20) {
    const stmt = this.db.prepare(`
      DELETE FROM session_events 
      WHERE id NOT IN (
        SELECT id FROM session_events 
        ORDER BY event_time_utc DESC, id DESC 
        LIMIT ?
      )
    `);

    return stmt.run(maxEvents);
  }

  // Get recent events
  getRecentEvents(limit = 5) {
    const stmt = this.db.prepare(`
      SELECT * FROM session_events 
      ORDER BY event_time_utc DESC 
      LIMIT ?
    `);

    return stmt.all(limit);
  }

  // Create or update session
  upsertSession(sessionData) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sessions (
        session_uuid, target_name, project_name, coordinates_ra, coordinates_dec,
        coordinates_ra_string, coordinates_dec_string, rotation, started_at,
        ended_at, target_end_time, is_active, is_expired
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      sessionData.session_uuid,
      sessionData.target_name,
      sessionData.project_name,
      sessionData.coordinates_ra,
      sessionData.coordinates_dec,
      sessionData.coordinates_ra_string,
      sessionData.coordinates_dec_string,
      sessionData.rotation,
      sessionData.started_at,
      sessionData.ended_at,
      sessionData.target_end_time,
      sessionData.is_active ? 1 : 0,
      sessionData.is_expired ? 1 : 0
    );
  }

  // Get session stats
  getStats() {
    const sessionCount = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get();
    const eventCount = this.db.prepare('SELECT COUNT(*) as count FROM session_events').get();
    const activeSession = this.db.prepare('SELECT COUNT(*) as count FROM sessions WHERE is_active = 1').get();

    return {
      totalSessions: sessionCount.count,
      totalEvents: eventCount.count,
      activeSessions: activeSession.count,
      lastUpdate: new Date().toISOString()
    };
  }
}

module.exports = SessionSchema;
