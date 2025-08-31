/**
 * Test dark capture event processing
 */

const path = require('path');
const EventProcessor = require('../src/services/sessionState/EventProcessor');
const SessionStateProcessor = require('../src/services/sessionState/SessionStateProcessor');

console.log('🧪 Testing Dark Capture Event Processing...\n');

// Mock dark capture sequence based on provided data
const darkEvents = [
    {
        Event: 'IMAGE-SAVE',
        Time: '2025-08-31T11:04:26.658Z',
        ImageStatistics: {
            ExposureTime: 180,
            ImageType: 'DARK',
            Filter: 'Ha',
            Temperature: -10,
            CameraName: 'ZWO ASI585MM Pro',
            Gain: 200,
            Offset: 1
        }
    },
    {
        Event: 'IMAGE-SAVE',
        Time: '2025-08-31T11:07:30.123Z',
        ImageStatistics: {
            ExposureTime: 180,
            ImageType: 'DARK',
            Filter: 'Ha',
            Temperature: -10,
            CameraName: 'ZWO ASI585MM Pro',
            Gain: 200,
            Offset: 1
        }
    },
    {
        Event: 'IMAGE-SAVE',
        Time: '2025-08-31T11:10:35.456Z',
        ImageStatistics: {
            ExposureTime: 180,
            ImageType: 'DARK',
            Filter: 'Ha',
            Temperature: -10,
            CameraName: 'ZWO ASI585MM Pro',
            Gain: 200,
            Offset: 1
        }
    },
    {
        Event: 'IMAGE-SAVE',
        Time: '2025-08-31T11:13:40.789Z',
        ImageStatistics: {
            ExposureTime: 60,
            ImageType: 'DARK',
            Filter: 'Ha',
            Temperature: -10,
            CameraName: 'ZWO ASI585MM Pro',
            Gain: 200,
            Offset: 1
        }
    },
    {
        Event: 'IMAGE-SAVE',
        Time: '2025-08-31T11:14:45.012Z',
        ImageStatistics: {
            ExposureTime: 60,
            ImageType: 'DARK',
            Filter: 'Ha',
            Temperature: -10,
            CameraName: 'ZWO ASI585MM Pro',
            Gain: 200,
            Offset: 1
        }
    }
].map(event => ({ ...event, parsedTime: new Date(event.Time) }));

// Test EventProcessor dark detection
console.log('📝 Event Processing Results:');
const eventProcessor = new EventProcessor();

darkEvents.forEach((event, index) => {
    const result = eventProcessor.processEvent(event);
    const exposureTime = event.ImageStatistics.ExposureTime;
    const icon = result?.type === 'dark' ? '⚫' : '📸';
    console.log(`  ${icon} IMAGE-SAVE: ${result?.type === 'dark' ? `Dark ${exposureTime}s` : 'Regular image'}`);
});

// Test SessionStateProcessor dark session detection
console.log('\n📊 Session State Analysis:');
const processor = new SessionStateProcessor();

// Process events through the session state manager
const testTime = new Date('2025-08-31T11:15:00.000Z');
console.log(`🔄 Processing session data from ${darkEvents.length} events`);

// Find session boundaries
const boundaries = processor.findSessionBoundaries(darkEvents, testTime);
console.log(`📊 Session boundaries:`, boundaries);

if (boundaries.hasActiveSession) {
    const sessionSlice = processor.extractSessionSlice(darkEvents, boundaries);
    console.log(`📊 Session slice: ${sessionSlice.length} events from ${sessionSlice[0]?.Time} to ${sessionSlice[sessionSlice.length-1]?.Time}`);
    
    // Build session state
    const sessionState = processor.buildSessionState(darkEvents, sessionSlice, boundaries);
    
    console.log('Session State:', {
        isActive: boundaries.hasActiveSession,
        sessionType: boundaries.sessionType,
        activity: sessionState.activity,
        darks: sessionState.darks,
        filter: sessionState.filter,
        lastImage: sessionState.lastImage
    });
} else {
    console.log('❌ No active session found');
}

// Validation
const validations = [
    { name: 'Dark session detected', expected: true, actual: boundaries.hasActiveSession && boundaries.sessionType === 'darks' },
    { name: 'Multiple exposure times detected', expected: true, actual: boundaries.hasActiveSession && processor.buildSessionState(darkEvents, processor.extractSessionSlice(darkEvents, boundaries), boundaries).darks?.exposureGroups && Object.keys(processor.buildSessionState(darkEvents, processor.extractSessionSlice(darkEvents, boundaries), boundaries).darks.exposureGroups).length === 2 },
    { name: 'Correct total image count', expected: true, actual: boundaries.hasActiveSession && processor.buildSessionState(darkEvents, processor.extractSessionSlice(darkEvents, boundaries), boundaries).darks?.totalImages === 5 },
    { name: 'Activity set to capturing darks', expected: true, actual: boundaries.hasActiveSession && processor.buildSessionState(darkEvents, processor.extractSessionSlice(darkEvents, boundaries), boundaries).activity?.subsystem === 'darks' },
    { name: '180s exposure has 3 images', expected: true, actual: boundaries.hasActiveSession && processor.buildSessionState(darkEvents, processor.extractSessionSlice(darkEvents, boundaries), boundaries).darks?.exposureGroups?.[180]?.count === 3 }
];

console.log('\n✅ Validation Results:');
const passedTests = validations.filter(test => test.actual === test.expected);
validations.forEach(validation => {
    const status = validation.actual === validation.expected ? '✅' : '❌';
    console.log(`  ${status} ${validation.name}: ${validation.actual}`);
});

console.log(`\n🎉 Overall Test Result: ${passedTests.length === validations.length ? 'PASSED' : 'FAILED'} (${passedTests.length}/${validations.length})`);

// Cleanup
eventProcessor.destroy();
processor.destroy();
