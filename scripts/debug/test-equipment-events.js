#!/usr/bin/env node

/**
 * Test Equipment Event Broadcasting
 * This script simulates equipment disconnect events to test the WebSocket integration
 */

const WebSocket = require('ws');

async function testEquipmentEvents() {
  console.log('🧪 Testing Equipment Event Broadcasting...\n');

  // Connect to NINA WebSocket endpoint
  const ninaWs = new WebSocket('ws://localhost:3001/ws/nina');
  
  ninaWs.on('open', () => {
    console.log('✅ Connected to NINA WebSocket endpoint');
    console.log('🎧 Listening for equipment events...\n');
  });

  ninaWs.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'nina-event' && message.data.Type === 'EQUIPMENT_CHANGE') {
        console.log('🎯 EQUIPMENT_CHANGE Event Received:');
        console.log(`   Device: ${message.data.Data.device}`);
        console.log(`   Event: ${message.data.Data.event}`);
        console.log(`   Time: ${message.data.Data.time}`);
        console.log(`   Original: ${message.data.Data.originalEvent}`);
        console.log('   ⚡ This should trigger NINAStatus widget refresh!\n');
      } else if (message.type === 'connection') {
        console.log('📡 Connection confirmed');
      } else {
        console.log('📨 Other event:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ninaWs.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });

  ninaWs.on('close', () => {
    console.log('❌ WebSocket connection closed');
  });

  console.log('💡 Instructions:');
  console.log('   1. Keep this script running');
  console.log('   2. In NINA, connect or disconnect a piece of equipment');
  console.log('   3. Watch for EQUIPMENT_CHANGE events here');
  console.log('   4. Check your dashboard to see if NINAStatus updates');
  console.log('\n⏰ Test will run for 2 minutes...\n');

  // Keep test running for 2 minutes
  setTimeout(() => {
    console.log('⏰ Test completed. Closing connection...');
    ninaWs.close();
    process.exit(0);
  }, 120000);
}

if (require.main === module) {
  testEquipmentEvents().catch(console.error);
}

module.exports = { testEquipmentEvents };
