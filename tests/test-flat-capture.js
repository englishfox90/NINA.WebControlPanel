// Test Flat Capture Event Processing
// Validates that the session widget correctly detects and displays flat capture sequences

const EventProcessor = require('../src/services/sessionState/EventProcessor');
const SessionStateProcessor = require('../src/services/sessionState/SessionStateProcessor');

// Sample flat capture event sequence from user
const flatCaptureEvents = [
  {
    "Time": "2025-08-30T23:19:41.9556867-05:00",
    "Event": "FLAT-COVER-CLOSED"
  },
  {
    "Time": "2025-08-30T23:19:53.9334531-05:00",
    "Event": "FLAT-LIGHT-TOGGLED"
  },
  {
    "Event": "FLAT-BRIGHTNESS-CHANGED",
    "Previous": 80,
    "New": 2048,
    "Time": "2025-08-30T23:19:57.933317-05:00"
  },
  {
    "Event": "FILTERWHEEL-CHANGED",
    "Previous": { "Name": "Ha", "Id": 1 },
    "New": { "Name": "Ha", "Id": 1 },
    "Time": "2025-08-30T23:19:57.9399432-05:00"
  },
  {
    "Event": "FLAT-BRIGHTNESS-CHANGED",
    "Previous": 2048,
    "New": 1024,
    "Time": "2025-08-30T23:20:03.9525225-05:00"
  },
  {
    "Event": "FILTERWHEEL-CHANGED",
    "Previous": { "Name": "Ha", "Id": 1 },
    "New": { "Name": "Ha", "Id": 1 },
    "Time": "2025-08-30T23:20:03.958104-05:00"
  },
  {
    "Event": "FLAT-BRIGHTNESS-CHANGED",
    "Previous": 1024,
    "New": 80,
    "Time": "2025-08-30T23:20:39.9338818-05:00"
  },
  {
    "Event": "FILTERWHEEL-CHANGED",
    "Previous": { "Name": "Ha", "Id": 1 },
    "New": { "Name": "Ha", "Id": 1 },
    "Time": "2025-08-30T23:20:43.6002605-05:00"
  },
  {
    "Event": "IMAGE-SAVE",
    "Time": "2025-08-30T23:20:43.6155003-05:00"
  },
  {
    "Event": "IMAGE-SAVE",
    "Time": "2025-08-30T23:20:47.2575367-05:00"
  },
  {
    "Event": "IMAGE-SAVE",
    "Time": "2025-08-30T23:20:50.5233206-05:00"
  },
  {
    "Event": "IMAGE-SAVE",
    "Time": "2025-08-30T23:20:53.8034869-05:00"
  },
  {
    "Event": "IMAGE-SAVE",
    "Time": "2025-08-30T23:20:57.0492604-05:00"
  },
  {
    "Time": "2025-08-30T23:20:59.9618462-05:00",
    "Event": "FLAT-LIGHT-TOGGLED"
  },
  {
    "Time": "2025-08-30T23:21:09.9582874-05:00",
    "Event": "FLAT-COVER-OPENED"
  }
];

async function testFlatCapture() {
  console.log('🧪 Testing Flat Capture Event Processing...\n');

  const eventProcessor = new EventProcessor();
  const sessionStateProcessor = new SessionStateProcessor();

  // Process each event
  console.log('📝 Event Processing Results:');
  for (const event of flatCaptureEvents) {
    const result = eventProcessor.processEvent(event);
    if (result?.type === 'flat') {
      console.log(`  🟡 ${event.Event}: ${result.data.action}${result.data.brightness ? ` (${result.data.brightness})` : ''}`);
    } else if (result?.type === 'image' && event.Event === 'IMAGE-SAVE') {
      console.log(`  📸 ${event.Event}: Image captured`);
    } else if (result?.type === 'filter') {
      console.log(`  🔴 ${event.Event}: Filter ${result.data.name}`);
    }
  }

  // Test session state processing
  console.log('\n📊 Session State Analysis:');
  const sessionState = sessionStateProcessor.processNINAEvents(flatCaptureEvents);
  
  console.log('Session State:', {
    isActive: sessionState.isActive,
    activity: sessionState.activity,
    flats: sessionState.flats,
    filter: sessionState.filter,
    lastImage: sessionState.lastImage
  });

  // Validation checks
  console.log('\n✅ Validation Results:');
  
  const validations = [
    {
      test: 'Flat session detected',
      result: sessionState.flats?.isActive === true,
      expected: true
    },
    {
      test: 'Correct filter detected',
      result: sessionState.flats?.filter === 'Ha',
      expected: true
    },
    {
      test: 'Correct image count',
      result: sessionState.flats?.imageCount === 5,
      expected: true
    },
    {
      test: 'Activity set to capturing flats',
      result: sessionState.activity?.subsystem === 'flats' && sessionState.activity?.state === 'capturing_flats',
      expected: true
    },
    {
      test: 'Last brightness recorded',
      result: sessionState.flats?.brightness === 80,
      expected: true
    }
  ];

  validations.forEach(validation => {
    const status = validation.result === validation.expected ? '✅' : '❌';
    console.log(`  ${status} ${validation.test}: ${validation.result}`);
  });

  const allPassed = validations.every(v => v.result === v.expected);
  console.log(`\n${allPassed ? '🎉' : '❌'} Overall Test Result: ${allPassed ? 'PASSED' : 'FAILED'}`);
  
  return allPassed;
}

// Run the test
if (require.main === module) {
  testFlatCapture().then(passed => {
    process.exit(passed ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  });
}

module.exports = { testFlatCapture };
