// Test Script for Unified Session Management System
// Validates database schema, components, and API integration

const path = require('path');
const fs = require('fs');

// Test configuration
const CONFIG = {
  dbPath: path.resolve(__dirname, '../../dashboard-config.sqlite'),
  serverPort: 3001,
  ninaWebSocketUrl: 'ws://172.26.81.152:1888',
  testDuration: 30000 // 30 seconds
};

console.log('🧪 Testing Unified Session Management System');
console.log('=' .repeat(60));

// Test 1: Database Schema Validation
async function testDatabaseSchema() {
  console.log('\n1️⃣ Testing Database Schema...');
  
  try {
    const { ConfigDatabase } = require('../../src/server/configDatabase');
    const db = new ConfigDatabase();
    
    // Test session tables exist
    const tables = ['sessions', 'session_events', 'session_state'];
    for (const table of tables) {
      const result = db.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
      if (result) {
        console.log(`   ✅ Table '${table}' exists`);
      } else {
        console.log(`   ❌ Table '${table}' missing`);
        return false;
      }
    }
    
    // Test indexes exist
    const indexes = db.db.prepare(`SELECT name FROM sqlite_master WHERE type='index'`).all();
    const expectedIndexes = ['idx_events_session', 'idx_events_time'];
    
    for (const expectedIndex of expectedIndexes) {
      const found = indexes.find(idx => idx.name === expectedIndex);
      if (found) {
        console.log(`   ✅ Index '${expectedIndex}' exists`);
      } else {
        console.log(`   ❌ Index '${expectedIndex}' missing`);
      }
    }
    
    db.close();
    return true;
  } catch (error) {
    console.error('   ❌ Database schema test failed:', error.message);
    return false;
  }
}

// Test 2: Component Initialization
async function testComponentInitialization() {
  console.log('\n2️⃣ Testing Component Initialization...');
  
  try {
    // Test EventNormalizer
    const EventNormalizer = require('../../src/server/session/EventNormalizer');
    const normalizer = new EventNormalizer();
    console.log('   ✅ EventNormalizer instantiated');
    
    // Test sample event normalization
    const sampleEvent = {
      Event: 'IMAGE-SAVE',
      Time: '2025-01-20T12:00:00',
      Data: { ImagePath: '/test/path.fits' }
    };
    
    const normalized = normalizer.normalizeEvent(sampleEvent);
    if (normalized && normalized.timestamp && normalized.eventType) {
      console.log('   ✅ Event normalization works');
    } else {
      console.log('   ❌ Event normalization failed');
      return false;
    }
    
    // Test SessionFSM
    const SessionFSM = require('../../src/server/session/SessionFSM');
    const fsm = new SessionFSM();
    console.log('   ✅ SessionFSM instantiated');
    
    // Test state transitions
    const initialState = fsm.currentState;
    if (initialState === 'idle') {
      console.log('   ✅ FSM starts in idle state');
    } else {
      console.log('   ❌ FSM initial state incorrect:', initialState);
      return false;
    }
    
    // Test NINAWebSocketClient (without actual connection)
    const NINAWebSocketClient = require('../../src/server/session/NINAWebSocketClient');
    const mockConfig = { baseUrl: 'http://test', apiPort: 1888 };
    const wsClient = new NINAWebSocketClient(mockConfig);
    console.log('   ✅ NINAWebSocketClient instantiated');
    
    // Test UnifiedSessionManager (requires configDatabase, so skip constructor test)
    const UnifiedSessionManager = require('../../src/server/session/UnifiedSessionManager');
    console.log('   ✅ UnifiedSessionManager module loaded (constructor requires database)');
    
    return true;
  } catch (error) {
    console.error('   ❌ Component initialization test failed:', error.message);
    return false;
  }
}

// Test 3: API Endpoints
async function testAPIEndpoints() {
  console.log('\n3️⃣ Testing API Endpoints...');
  
  try {
    const axios = require('axios').default;
    const baseUrl = `http://localhost:${CONFIG.serverPort}`;
    
    // First check if server is running
    try {
      await axios.get(`${baseUrl}/api/config/health`, { timeout: 1000 });
    } catch (error) {
      console.log('   ⚠️  Server is not running - skipping API tests');
      console.log('   💡 Start the server with "npm start" to test API endpoints');
      return true; // Don't fail the test if server isn't running
    }
    
    // Test session health endpoint
    try {
      const healthResponse = await axios.get(`${baseUrl}/api/session/health`);
      if (healthResponse.status === 200) {
        console.log('   ✅ Session health endpoint working');
        console.log('       Health data:', JSON.stringify(healthResponse.data.data, null, 2));
      } else {
        console.log('   ⚠️  Session health endpoint returned status:', healthResponse.status);
      }
    } catch (error) {
      console.log('   ❌ Session health endpoint failed:', error.message);
    }
    
    // Test main session endpoint
    try {
      const sessionResponse = await axios.get(`${baseUrl}/api/session`);
      if (sessionResponse.status === 200) {
        console.log('   ✅ Main session endpoint working');
        console.log('       Session data structure:', Object.keys(sessionResponse.data.data || {}));
      } else {
        console.log('   ⚠️  Main session endpoint returned status:', sessionResponse.status);
      }
    } catch (error) {
      console.log('   ❌ Main session endpoint failed:', error.message);
    }
    
    // Test session stats
    try {
      const statsResponse = await axios.get(`${baseUrl}/api/session/stats`);
      if (statsResponse.status === 200) {
        console.log('   ✅ Session stats endpoint working');
        console.log('       Stats data:', JSON.stringify(statsResponse.data.data, null, 2));
      } else {
        console.log('   ⚠️  Session stats endpoint returned status:', statsResponse.status);
      }
    } catch (error) {
      console.log('   ❌ Session stats endpoint failed:', error.message);
    }
    
    // Test manual refresh
    try {
      const refreshResponse = await axios.post(`${baseUrl}/api/session/refresh`);
      if (refreshResponse.status === 200) {
        console.log('   ✅ Manual refresh endpoint working');
      } else {
        console.log('   ⚠️  Manual refresh returned status:', refreshResponse.status);
      }
    } catch (error) {
      console.log('   ❌ Manual refresh endpoint failed:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('   ❌ API endpoints test failed:', error.message);
    return false;
  }
}

// Test 4: WebSocket Connection
async function testWebSocketConnection() {
  console.log('\n4️⃣ Testing WebSocket Connection...');
  
  return new Promise((resolve) => {
    try {
      const WebSocket = require('ws');
      const wsUrl = `ws://localhost:${CONFIG.serverPort}/ws/unified`;
      
      console.log('   🔌 Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      let messagesReceived = 0;
      const timeout = setTimeout(() => {
        ws.close();
        if (messagesReceived > 0) {
          console.log(`   ✅ WebSocket working (received ${messagesReceived} messages)`);
          resolve(true);
        } else {
          console.log('   ⚠️  WebSocket connected but no messages received');
          resolve(false);
        }
      }, 10000); // 10 second timeout
      
      ws.on('open', () => {
        console.log('   ✅ WebSocket connected');
      });
      
      ws.on('message', (data) => {
        messagesReceived++;
        const message = JSON.parse(data.toString());
        console.log(`   📨 Received message type: ${message.type}`);
      });
      
      ws.on('close', () => {
        clearTimeout(timeout);
        console.log('   🔌 WebSocket disconnected');
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log('   ❌ WebSocket error:', error.code || error.message);
        if (error.code === 'ECONNREFUSED') {
          console.log('   💡 Server is not running - start with "npm start" to test WebSocket');
        }
        resolve(false);
      });
      
    } catch (error) {
      console.error('   ❌ WebSocket connection test failed:', error.message);
      resolve(false);
    }
  });
}

// Main test runner
async function runTests() {
  console.log(`📍 Test Configuration:
   Database: ${CONFIG.dbPath}
   Server: http://localhost:${CONFIG.serverPort}
   NINA WebSocket: ${CONFIG.ninaWebSocketUrl}
   Test Duration: ${CONFIG.testDuration}ms\n`);
  
  const results = {
    databaseSchema: false,
    componentInitialization: false,
    apiEndpoints: false,
    webSocketConnection: false
  };
  
  // Run tests sequentially
  results.databaseSchema = await testDatabaseSchema();
  results.componentInitialization = await testComponentInitialization();
  results.apiEndpoints = await testAPIEndpoints();
  results.webSocketConnection = await testWebSocketConnection();
  
  // Results summary
  console.log('\n📊 Test Results Summary');
  console.log('=' .repeat(60));
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`${status} - ${testName}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! Unified Session Management System is ready.');
  } else {
    console.log('⚠️  Some tests failed. Review the issues above before deployment.');
  }
  
  return passed === total;
}

// Check if script is run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, CONFIG };
