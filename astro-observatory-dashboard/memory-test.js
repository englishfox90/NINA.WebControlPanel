const si = require('systeminformation');

si.mem().then(mem => {
  const totalGB = mem.total / (1024 ** 3);
  const availableGB = mem.available / (1024 ** 3);
  const activeGB = mem.active / (1024 ** 3);
  
  console.log('Activity Monitor: 19.19 GB used (80%)');
  console.log('Total memory:', totalGB.toFixed(2), 'GB');
  console.log('Available:', availableGB.toFixed(2), 'GB');
  console.log('Active:', activeGB.toFixed(2), 'GB');
  
  // Try: total - available 
  const method1 = totalGB - availableGB;
  console.log('\nMethod 1 (total - available):', method1.toFixed(2), 'GB', `(${((method1/totalGB)*100).toFixed(1)}%)`);
  
  // The issue might be that "available" includes some unused cached memory
  // Let's try a hybrid approach for macOS
  const method2 = totalGB - availableGB + 2.0; // Add back some reasonable cache usage
  console.log('Method 2 (adjusted):', method2.toFixed(2), 'GB', `(${((method2/totalGB)*100).toFixed(1)}%)`);
  
  // Or maybe we need to scale based on the difference
  const activityMonitorUsed = 19.19;
  const currentCalculated = method1;
  const scaleFactor = activityMonitorUsed / currentCalculated;
  console.log('\nScale factor needed:', scaleFactor.toFixed(2));
  
  // Try a proportional approach
  const method3 = activeGB * 3.0; // Active memory times a factor
  console.log('Method 3 (active * 3):', method3.toFixed(2), 'GB', `(${((method3/totalGB)*100).toFixed(1)}%)`);
  
}).catch(console.error);
