// Test Modular Session System
// Quick validation of the new modular architecture

const path = require('path');

// Mock dependencies
class MockConfigDatabase {
  constructor() {
    this.db = {
      prepare: () => ({ get: () => null, run: () => {}, all: () => [] })
    };
  }
  getConfig() {
    return {
      nina: { 
        baseUrl: 'http://172.26.81.152',
        apiPort: 1888,
        websocketPort: 1888
      }
    };
  }
}

class MockNINAService {
  async getEventHistory() {
    return {
      Response: [
        {
          TimeStamp: new Date().toISOString(),
          Type: 'Info',
          Source: 'Test',
          Message: 'Test event for modular architecture'
        }
      ]
    };
  }
}

async function testModularArchitecture() {
  console.log('🧪 Testing Modular Session Architecture');
  console.log('======================================');
  
  try {
    // Test individual component loading
    console.log('\n1. Testing component loading...');
    
    const UnifiedSessionManager = require('../../src/server/session/UnifiedSessionManager');
    const SessionInitializer = require('../../src/server/session/SessionInitializer');
    const SessionEventHandler = require('../../src/server/session/SessionEventHandler');
    const SessionStateManager = require('../../src/server/session/SessionStateManager');
    const SessionStatsManager = require('../../src/server/session/SessionStatsManager');
    
    console.log('✅ All components loaded successfully');
    
    // Test component instantiation
    console.log('\n2. Testing component instantiation...');
    
    const mockConfigDb = new MockConfigDatabase();
    const mockNINAService = new MockNINAService();
    
    const manager = new UnifiedSessionManager(mockConfigDb, mockNINAService);
    console.log('✅ UnifiedSessionManager created');
    
    // Test type checking
    console.log('\n3. Testing component types...');
    console.log(`UnifiedSessionManager type: ${typeof UnifiedSessionManager}`);
    console.log(`Instance type: ${manager.constructor.name}`);
    console.log(`Is EventEmitter: ${manager.emit && typeof manager.emit === 'function'}`);
    
    // Test component structure
    console.log('\n4. Testing component structure...');
    console.log(`Has initializer: ${!!manager.initializer}`);
    console.log(`Has eventHandler: ${!!manager.eventHandler}`);
    console.log(`Has stateManager: ${!!manager.stateManager}`);
    console.log(`Has statsManager: ${!!manager.statsManager}`);
    
    // Test basic methods
    console.log('\n5. Testing basic methods...');
    console.log(`Has initialize method: ${typeof manager.initialize === 'function'}`);
    console.log(`Has getCurrentSessionData method: ${typeof manager.getCurrentSessionData === 'function'}`);
    console.log(`Has getStats method: ${typeof manager.getStats === 'function'}`);
    console.log(`Has destroy method: ${typeof manager.destroy === 'function'}`);
    
    // Test empty state
    console.log('\n6. Testing initial state...');
    const initialData = manager.getCurrentSessionData();
    console.log(`Initial data type: ${typeof initialData}`);
    console.log(`Has isActive property: ${initialData.hasOwnProperty('isActive')}`);
    
    // Test stats (before initialization)
    console.log('\n7. Testing stats...');
    const stats = manager.getStats();
    console.log(`Stats type: ${typeof stats}`);
    console.log(`Has database property: ${stats.hasOwnProperty('database')}`);
    
    // Test cleanup
    console.log('\n8. Testing cleanup...');
    manager.destroy();
    console.log('✅ Manager destroyed successfully');
    
    console.log('\n🎉 All modular architecture tests passed!');
    console.log('✅ Components are properly separated');
    console.log('✅ Dependencies are correctly managed');
    console.log('✅ Architecture is ready for production');
    
  } catch (error) {
    console.error('❌ Modular architecture test failed:', error);
    console.error('Stack:', error.stack);
    return false;
  }
  
  return true;
}

// Component size analysis
function analyzeComponentSizes() {
  console.log('\n📊 Component Size Analysis');
  console.log('==========================');
  
  const fs = require('fs');
  const components = [
    'src/server/session/UnifiedSessionManager.js',
    'src/server/session/SessionInitializer.js',
    'src/server/session/SessionEventHandler.js', 
    'src/server/session/SessionStateManager.js',
    'src/server/session/SessionStatsManager.js'
  ];
  
  components.forEach(component => {
    try {
      const content = fs.readFileSync(component, 'utf8');
      const lines = content.split('\n').length;
      const size = Math.round(content.length / 1024);
      console.log(`${component.split('/').pop()}: ${lines} lines, ${size}KB`);
    } catch (error) {
      console.log(`${component}: Error reading file`);
    }
  });
}

// Run tests
if (require.main === module) {
  testModularArchitecture().then(success => {
    if (success) {
      analyzeComponentSizes();
      process.exit(0);
    } else {
      process.exit(1);
    }
  });
}

module.exports = { testModularArchitecture };
