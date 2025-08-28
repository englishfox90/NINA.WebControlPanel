const si = require('systeminformation');
const os = require('os');

console.log('=== Memory Debug ===');

// Native Node.js memory info
const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;

console.log('Node.js:');
console.log('Total:', (totalMem / (1024 ** 3)).toFixed(2), 'GB');
console.log('Free:', (freeMem / (1024 ** 3)).toFixed(2), 'GB');
console.log('Used:', (usedMem / (1024 ** 3)).toFixed(2), 'GB');
console.log('Usage:', ((usedMem / totalMem) * 100).toFixed(1) + '%');

si.mem().then(mem => {
  console.log('\nsysteminformation (original):');
  console.log('Total:', (mem.total / (1024 ** 3)).toFixed(2), 'GB');
  console.log('Used:', (mem.used / (1024 ** 3)).toFixed(2), 'GB');
  console.log('Free:', (mem.free / (1024 ** 3)).toFixed(2), 'GB');
  console.log('Available:', (mem.available / (1024 ** 3)).toFixed(2), 'GB');
  console.log('Usage:', ((mem.used / mem.total) * 100).toFixed(1) + '%');
  
  // New calculation for macOS
  const totalGB = mem.total / (1024 ** 3);
  const availableGB = mem.available / (1024 ** 3);
  const usedGB = totalGB - availableGB;
  const usagePercent = ((totalGB - availableGB) / totalGB) * 100;
  
  console.log('\nCorrected for macOS:');
  console.log('Total:', totalGB.toFixed(2), 'GB');
  console.log('Used:', usedGB.toFixed(2), 'GB');
  console.log('Available:', availableGB.toFixed(2), 'GB');
  console.log('Usage:', usagePercent.toFixed(1) + '%');
}).catch(console.error);
