#!/usr/bin/env node

/**
 * Test NINA WebSocket Integration
 * This script tests the enhanced WebSocket functionality for the three widgets
 */

const WebSocket = require('ws');

function testNINAWebSocket() {
  console.log('🧪 Testing NINA WebSocket Integration...\n');

  const ws = new WebSocket('ws://localhost:3001/ws/nina');
  
  ws.on('open', () => {
    console.log('✅ Connected to NINA WebSocket server');
    console.log('🎧 Listening for events...\n');
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received message:', message.type);
      
      if (message.type === 'nina-event') {
        const event = message.data;
        console.log(`🎯 NINA Event: ${event.Type}`);
        console.log(`   Timestamp: ${event.Timestamp}`);
        console.log(`   Data:`, event.Data);
        
        // Test the specific events our widgets are listening for
        if (event.Type === 'IMAGE-SAVE' || event.Type === 'IMAGE_SAVE') {
          console.log('   📸 This would trigger SchedulerWidget and ImageViewer refresh!');
        }
        if (event.Type.includes('EQUIPMENT') || event.Type.includes('DEVICE')) {
          console.log('   ⚙️  This would trigger NINAStatus refresh!');
        }
        console.log('');
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('❌ WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });

  // Keep the test running for 60 seconds
  setTimeout(() => {
    console.log('⏰ Test completed. Closing connection...');
    ws.close();
    process.exit(0);
  }, 60000);
}

// Also test REST endpoints
async function testAPIEndpoints() {
  console.log('🔍 Testing API endpoints...\n');

  const endpoints = [
    'http://localhost:3001/api/nina/equipment',
    'http://localhost:3001/api/scheduler/progress', 
    'http://localhost:3001/api/nina/latest-image'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const response = await fetch(endpoint);
      const data = await response.json();
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      
      if (endpoint.includes('latest-image')) {
        console.log(`   Latest image found: ${data.success}`);
        console.log(`   Message: ${data.message}`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
  console.log('');
}

// Run both tests
async function runTests() {
  await testAPIEndpoints();
  testNINAWebSocket();
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testNINAWebSocket, testAPIEndpoints };
