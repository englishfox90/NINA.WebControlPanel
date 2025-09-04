const SessionInitializer = require('./src/server/session/SessionInitializer.js');
const path = require('path');

// Mock dependencies
class MockSessionFSM {
  getSessionData() {
    return {
      target: {
        name: "Barnard 160",
        project: "Sample Project",
        coordinates: { ra: 21.5, dec: 14.2 },
        rotation: 45.5
      },
      filter: { name: "Ha" },
      lastImage: { filename: "test.fits", time: "2025-01-01T12:00:00Z" },
      safe: { isSafe: true, time: "2025-01-01T12:00:00Z" },
      activity: { subsystem: "imaging", state: "active", since: "2025-01-01T11:30:00Z" },
      lastEquipmentChange: { type: "connect", device: "camera", time: "2025-01-01T11:00:00Z" },
      flats: {
        isActive: false,
        filter: "V",
        brightness: 100,
        imageCount: 25,
        startedAt: "2025-01-01T10:00:00Z",
        lastImageAt: "2025-01-01T10:30:00Z"
      },
      darks: {
        isActive: true,
        currentExposureTime: 300,
        exposureGroups: [{ time: 300, count: 10 }, { time: 600, count: 5 }],
        totalImages: 15,
        startedAt: "2025-01-01T09:00:00Z",
        lastImageAt: "2025-01-01T09:45:00Z"
      },
      sessionStart: "2025-01-01T08:00:00Z",
      isActive: true
    };
  }
}

console.log('🧪 Testing session state conversion and SQLite binding...\n');

try {
  // Create a SessionInitializer instance with minimal mocks
  const initializer = new SessionInitializer(
    path.join(__dirname, 'dashboard-config.sqlite'), 
    { 
      normalizeEvent: (e) => e,
      normalizeBatch: (e) => e
    }, 
    null // No WebSocket client needed for this test
  );
  
  // Mock the sessionFSM
  initializer.sessionFSM = new MockSessionFSM();
  
  // Test the conversion
  const sessionData = initializer.sessionFSM.getSessionData();
  console.log('📊 Original session data:');
  console.log(JSON.stringify(sessionData, null, 2));
  
  const dbFormat = initializer.convertToDbFormat(sessionData);
  console.log('\n🔧 Converted to DB format:');
  console.log(JSON.stringify(dbFormat, null, 2));
  
  // Check each field type
  console.log('\n🔍 Data type analysis:');
  for (const [key, value] of Object.entries(dbFormat)) {
    const type = typeof value;
    const isNull = value === null;
    const isSQLiteCompatible = ['number', 'string', 'bigint', 'undefined'].includes(type) || isNull || Buffer.isBuffer(value);
    
    console.log(`  ${key}: ${isNull ? 'null' : type} = ${JSON.stringify(value)} ${isSQLiteCompatible ? '✅' : '❌'}`);
    
    if (!isSQLiteCompatible) {
      console.log(`    ⚠️  PROBLEM: ${key} has incompatible type: ${type}`);
    }
  }
  
} catch (error) {
  console.error('❌ Error during test:', error);
}
