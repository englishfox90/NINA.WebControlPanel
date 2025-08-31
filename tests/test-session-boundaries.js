/**
 * Test session boundary detection for both sequence and flat capture sessions
 */

const path = require('path');
const SessionStateProcessor = require('../src/services/sessionState/SessionStateProcessor');

console.log('🧪 Testing Session Boundary Detection...\n');

// Mock sequence session events
const sequenceEvents = [
    { Event: 'SEQUENCE-STARTING', Time: '2025-08-30T20:00:00Z' },
    { Event: 'IMAGE-SAVE', Time: '2025-08-30T20:01:00Z' },
    { Event: 'IMAGE-SAVE', Time: '2025-08-30T20:02:00Z' },
    { Event: 'SEQUENCE-FINISHED', Time: '2025-08-30T20:03:00Z' }
].map(event => ({ ...event, parsedTime: new Date(event.Time) }));

// Mock flat capture session events  
const flatEvents = [
    { Event: 'FLAT-COVER-CLOSED', Time: '2025-08-30T21:00:00Z' },
    { Event: 'FLAT-BRIGHTNESS-CHANGED', Time: '2025-08-30T21:00:30Z', New: 1024 },
    { Event: 'IMAGE-SAVE', Time: '2025-08-30T21:01:00Z' },
    { Event: 'IMAGE-SAVE', Time: '2025-08-30T21:01:30Z' },
    { Event: 'FLAT-COVER-OPENED', Time: '2025-08-30T21:02:00Z' }
].map(event => ({ ...event, parsedTime: new Date(event.Time) }));

// Mixed events with both sequence and flats
const mixedEvents = [
    { Event: 'SEQUENCE-STARTING', Time: '2025-08-30T19:00:00Z' },
    { Event: 'IMAGE-SAVE', Time: '2025-08-30T19:01:00Z' },
    { Event: 'SEQUENCE-FINISHED', Time: '2025-08-30T19:02:00Z' },
    { Event: 'FLAT-COVER-CLOSED', Time: '2025-08-30T21:00:00Z' },
    { Event: 'IMAGE-SAVE', Time: '2025-08-30T21:01:00Z' },
    { Event: 'FLAT-COVER-OPENED', Time: '2025-08-30T21:02:00Z' }
].map(event => ({ ...event, parsedTime: new Date(event.Time) }));

const processor = new SessionStateProcessor();

console.log('📋 Test 1: Sequence Session Boundaries');
const sequenceBoundaries = processor.findSessionBoundaries(sequenceEvents, new Date('2025-08-30T20:01:30Z'));
console.log('Result:', sequenceBoundaries);
console.log('Expected: hasActiveSession = true, sessionType = sequence\n');

console.log('📋 Test 2: Flat Capture Session Boundaries');
const flatBoundaries = processor.findSessionBoundaries(flatEvents, new Date('2025-08-30T21:01:30Z'));
console.log('Result:', flatBoundaries);
console.log('Expected: hasActiveSession = true, sessionType = flats\n');

console.log('📋 Test 3: Mixed Events - Current Time in Flat Session');
const mixedBoundaries = processor.findSessionBoundaries(mixedEvents, new Date('2025-08-30T21:01:30Z'));
console.log('Result:', mixedBoundaries);
console.log('Expected: hasActiveSession = true, sessionType = flats (most recent)\n');

console.log('📋 Test 4: No Active Session');
const noSessionBoundaries = processor.findSessionBoundaries(sequenceEvents, new Date('2025-08-30T18:00:00Z'));
console.log('Result:', noSessionBoundaries);
console.log('Expected: hasActiveSession = false\n');

// Validate results
const tests = [
    { name: 'Sequence session detection', result: sequenceBoundaries.hasActiveSession && sequenceBoundaries.sessionType === 'sequence' },
    { name: 'Flat session detection', result: flatBoundaries.hasActiveSession && flatBoundaries.sessionType === 'flats' },
    { name: 'Most recent session priority', result: mixedBoundaries.hasActiveSession && mixedBoundaries.sessionType === 'flats' },
    { name: 'No session detection', result: !noSessionBoundaries.hasActiveSession }
];

console.log('✅ Validation Results:');
const passedTests = tests.filter(test => test.result);
tests.forEach(test => {
    console.log(`  ${test.result ? '✅' : '❌'} ${test.name}`);
});

console.log(`\n🎉 Overall Result: ${passedTests.length}/${tests.length} tests passed`);
