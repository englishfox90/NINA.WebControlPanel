#!/usr/bin/env node

// Debug script to check current session state and recent events

const Database = require('better-sqlite3');
const path = require('path');

// Connect to the session database
const dbPath = path.join(__dirname, '..', '..', 'src', 'server', 'dashboard-config.sqlite');
const db = new Database(dbPath);

console.log('🔍 Checking current session state from database...');
console.log('📂 Database:', dbPath);

try {
  // First, check what tables and columns we actually have
  console.log('\n📋 Database schema:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  tables.forEach(table => {
    console.log(`\nTable: ${table.name}`);
    const columns = db.pragma(`table_info(${table.name})`);
    columns.forEach(col => console.log(`  - ${col.name} (${col.type})`));
  });
  
  // Check recent events from database
  console.log('\n📊 Recent events from database:');
  const recentEvents = db.prepare(`
    SELECT event_type, event_data, created_at 
    FROM session_events 
    ORDER BY created_at DESC 
    LIMIT 10
  `).all();
  
  recentEvents.forEach((event, i) => {
    const eventData = JSON.parse(event.event_data);
    const time = new Date(event.created_at);
    console.log(`${i + 1}. ${event.event_type} at ${time.toISOString()} (DB: ${event.created_at})${eventData.Data?.Target ? ` (${eventData.Data.Target})` : ''}`);
    if (i === 0) {
      console.log('   Raw event data:', event.event_data.substring(0, 300));
    }
  });
  
  // Check current session state
  console.log('\n📈 Current session state:');
  const sessionState = db.prepare('SELECT * FROM session_state ORDER BY updated_at DESC LIMIT 1').get();
  
  if (sessionState) {
    console.log('Session State:', sessionState.session_state);
    console.log('Updated at:', new Date(sessionState.updated_at).toISOString());
    console.log('Data preview:', sessionState.data?.substring(0, 200) + '...');
  } else {
    console.log('❌ No session state found in database');
  }
  
  // Check what timezone we're in
  console.log('\n🕐 Timezone information:');
  console.log('Current system time:', new Date().toISOString());
  console.log('Current local time:', new Date().toString());
  console.log('Timezone offset (minutes):', new Date().getTimezoneOffset());
  
} catch (error) {
  console.error('❌ Error checking session:', error);
} finally {
  db.close();
}
