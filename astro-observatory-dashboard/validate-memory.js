// Platform Memory Validation Test
const SystemMonitor = require('./systemMonitor');

async function validateMemoryCalculation() {
  console.log('=== Memory Platform Validation ===');
  console.log(`Platform: ${process.platform}`);
  
  try {
    const monitor = new SystemMonitor();
    const memoryInfo = await monitor.getMemoryInfo();
    
    console.log('\n📊 Memory Report:');
    console.log(`Total: ${memoryInfo.total} GB`);
    console.log(`Used: ${memoryInfo.used} GB (${memoryInfo.usagePercent}%)`);
    console.log(`Available: ${memoryInfo.available} GB`);
    console.log(`Platform: ${memoryInfo.platform}`);
    
    // Simple validation
    const isValid = memoryInfo.usagePercent >= 0 && memoryInfo.usagePercent <= 100;
    console.log(`\n✅ Validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    if (process.platform === 'darwin') {
      console.log('\n📱 Activity Monitor Reference: ~80% (19.19GB/24GB)');
      console.log(`Our calculation: ${memoryInfo.usagePercent}% (${memoryInfo.used}GB/${memoryInfo.total}GB)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

validateMemoryCalculation();
