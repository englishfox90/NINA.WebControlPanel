const WebSocket = require('ws');

console.log('🔍 Monitoring WebSocket for IMAGE-SAVE events...');

const wsProtocol = 'ws';
const wsUrl = `${wsProtocol}://localhost:3001/ws/unified`;

let eventCount = 0;
const ws = new WebSocket(wsUrl);

const timeout = setTimeout(() => {
  console.log(`⏰ Monitoring stopped after 5 minutes. IMAGE-SAVE events received: ${eventCount}`);
  ws.close();
  process.exit(0);
}, 300000); // 5 minutes to catch the next image

ws.on('open', () => {
  console.log('📡 Connected to WebSocket, monitoring for IMAGE-SAVE events...');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'nina-event' && message.data?.Type === 'IMAGE-SAVE') {
      eventCount++;
      console.log('📸 IMAGE-SAVE event detected:', {
        timestamp: message.data.Timestamp,
        hasImageStatistics: !!message.data.Data?.ImageStatistics,
        eventNumber: eventCount
      });
      
      if (message.data.Data?.ImageStatistics) {
        const stats = message.data.Data.ImageStatistics;
        console.log('  - ImageStatistics found:', {
          imageType: stats.ImageType,
          filter: stats.Filter,
          exposureTime: stats.ExposureTime,
          temperature: stats.Temperature
        });
      }
    } else if (message.type === 'unifiedSession' && message.data?.lastImage) {
      console.log('📸 Session update with lastImage:', {
        hasLastImage: !!message.data.lastImage,
        imageType: message.data.lastImage.type,
        filter: message.data.lastImage.filter,
        timestamp: message.data.lastImage.timestamp
      });
    }
  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('📡 WebSocket connection closed');
  clearTimeout(timeout);
});
