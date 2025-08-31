/**
 * Test the fixed issues:
 * 1. Target expiration (8-hour limit)
 * 2. Equipment changes reflect in session
 * 3. Dark image processing works
 * 4. Session always includes darks/flats objects
 */

const SessionStateProcessor = require('../src/services/sessionState/SessionStateProcessor');

console.log('🧪 Testing Session State Fixes...\n');

// Test 1: Target Expiration (8 hours)
console.log('📋 Test 1: Target Expiration Check');
const processor = new SessionStateProcessor();

// Create a target from 9 hours ago
const oldTargetEvent = {
  Event: 'TS-NEWTARGETSTART',
  TargetName: 'Orion Nebula',
  ProjectName: 'Deep Sky Project',
  Time: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(), // 9 hours ago
  Coordinates: { ra: 5.5, dec: -5.4, raString: '05h 30m', decString: '-05° 24m' }
};

const target = processor.processTargetEvent(oldTargetEvent);
const isExpired = processor.isTargetExpired(target, null);
console.log(`  Target: ${target.name}`);
console.log(`  Started: ${target.startedAt}`);  
console.log(`  Is Expired: ${isExpired ? '✅ YES (>8h old)' : '❌ NO'}`);

// Test 2: Recent target should not be expired
console.log('\n📋 Test 2: Recent Target Check');
const recentTargetEvent = {
  Event: 'TS-NEWTARGETSTART',
  TargetName: 'Andromeda Galaxy', 
  ProjectName: 'Galaxy Survey',
  Time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
  Coordinates: { ra: 0.7, dec: 41.3, raString: '00h 42m', decString: '+41° 16m' }
};

const recentTarget = processor.processTargetEvent(recentTargetEvent);
const recentExpired = processor.isTargetExpired(recentTarget, new Date().toISOString());
console.log(`  Target: ${recentTarget.name}`);
console.log(`  Started: ${recentTarget.startedAt}`);
console.log(`  Is Expired: ${recentExpired ? '❌ YES (should not be!)' : '✅ NO (recent)'}`);

// Test 3: Dark image processing
console.log('\n📋 Test 3: Dark Image Processing');
const darkImageEvent = {
  Event: 'IMAGE-SAVE',
  Time: new Date().toISOString(),
  ImageStatistics: {
    ExposureTime: 300,
    ImageType: 'DARK',
    Filter: 'Red',
    Temperature: -10,
    CameraName: 'ZWO ASI294MM Pro'
  },
  parsedTime: new Date()
};

// Process session slice with dark event
const sessionSlice = [darkImageEvent];
const sessionData = processor.processSessionSlice(sessionSlice);

console.log(`  Dark Active: ${sessionData.darks?.isActive ? '✅ TRUE' : '❌ FALSE'}`);
console.log(`  Total Images: ${sessionData.darks?.totalImages || 0}`);
console.log(`  Exposure Time: ${sessionData.darks?.currentExposureTime}s`);
console.log(`  Activity: ${sessionData.activity?.subsystem} - ${sessionData.activity?.state}`);

// Test 4: Session state always includes darks/flats
console.log('\n📋 Test 4: Default Objects Always Present');
const emptySessionSlice = [];
const emptySessionData = processor.processSessionSlice(emptySessionSlice);

console.log(`  Flats Object: ${emptySessionData.flats ? '✅ PRESENT' : '❌ MISSING'}`);
console.log(`  Darks Object: ${emptySessionData.darks ? '✅ PRESENT' : '❌ MISSING'}`);
console.log(`  Flats Active: ${emptySessionData.flats?.isActive}`);
console.log(`  Darks Active: ${emptySessionData.darks?.isActive}`);

// Test 5: Build session state includes defaults
console.log('\n📋 Test 5: BuildSessionState Includes Defaults');
const builtState = processor.buildSessionState([], [], { hasActiveSession: false, startIndex: -1, endIndex: -1 });

console.log(`  Built State Flats: ${builtState.flats ? '✅ PRESENT' : '❌ MISSING'}`);
console.log(`  Built State Darks: ${builtState.darks ? '✅ PRESENT' : '❌ MISSING'}`);
console.log(`  Flats Default: isActive=${builtState.flats?.isActive}, images=${builtState.flats?.imageCount}`);
console.log(`  Darks Default: isActive=${builtState.darks?.isActive}, images=${builtState.darks?.totalImages}`);

console.log('\n🎉 All tests completed!');

// Cleanup
processor.destroy();
