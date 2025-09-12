const WebSocket = require('ws');

console.log('🔌 Testing NINA WebSocket without subscription...');

const wsUrl = 'ws://172.26.81.152:1888/v2/socket';
console.log(`🎯 Connecting to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

const timeout = setTimeout(() => {
  console.log('⏰ Test completed - disconnecting');
  ws.close();
  process.exit(0);
}, 60000); // 1 minute test

ws.on('open', () => {
  console.log('✅ Connected to NINA WebSocket successfully!');
  console.log('⚠️ NOT sending subscription message - testing if events come automatically');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 Received message from NINA:', {
      Type: message.Type,
      Success: message.Success,
      Event: message.Response?.Event,
      hasImageStatistics: !!message.Response?.ImageStatistics
    });
    
    if (message.Response?.Event === 'IMAGE-SAVE') {
      console.log('🖼️ IMAGE-SAVE event details:', {
        ImageStatistics: !!message.Response.ImageStatistics,
        Filter: message.Response.ImageStatistics?.Filter,
        ExposureTime: message.Response.ImageStatistics?.ExposureTime
      });
    }
  } catch (error) {
    console.log('📨 Raw message:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket connection error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`📡 WebSocket closed - Code: ${code}, Reason: ${reason}`);
  clearTimeout(timeout);
});
