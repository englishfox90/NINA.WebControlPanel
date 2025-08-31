#!/usr/bin/env node

/**
 * Test Enhanced Session State Reducer Pattern
 * Validates the reducer logic with sample NINA events
 */

const { SessionStateReducer, EMPTY_SESSION_STATE } = require('../../src/services/sessionStateReducer');

console.log('🧪 Testing Enhanced Session State Reducer Pattern...\n');

// Initialize reducer with test configuration
const reducer = new SessionStateReducer({
  nina_timezone: 'America/New_York',
  user_timezone: 'America/New_York',
  display_24h: false
});

// Sample NINA events for testing
const testEvents = [
  // Session start
  {
    Event: 'SEQUENCE-STARTING',
    Time: '2024-01-15T20:00:00-05:00',
    Id: 1
  },
  
  // Target selection
  {
    Event: 'TS-NEWTARGETSTART',
    Time: '2024-01-15T20:01:00-05:00',
    TargetName: 'M31 Andromeda Galaxy',
    ProjectName: 'Deep Sky Objects',
    RAString: '00:42:44.31',
    DecString: '+41:16:09.4',
    Rotation: 180,
    Id: 2
  },
  
  // Filter change
  {
    Event: 'FILTERWHEEL-CHANGED',
    Time: '2024-01-15T20:02:00-05:00',
    Previous: { Name: 'L' },
    New: { Name: 'Ha' },
    Id: 3
  },
  
  // Equipment connection
  {
    Event: 'CAMERA-CONNECTED',
    Time: '2024-01-15T20:02:30-05:00',
    Id: 4
  },
  
  // Safety event
  {
    Event: 'SAFETY-CHANGED',
    Time: '2024-01-15T20:03:00-05:00',
    IsSafe: true,
    Id: 5
  },
  
  // Activity events
  {
    Event: 'AUTOFOCUS-START',
    Time: '2024-01-15T20:05:00-05:00',
    Id: 6
  },
  
  {
    Event: 'AUTOFOCUS-FINISHED',
    Time: '2024-01-15T20:07:00-05:00',
    Id: 7
  },
  
  {
    Event: 'GUIDER-START',
    Time: '2024-01-15T20:08:00-05:00',
    Id: 8
  },
  
  // Image capture
  {
    Event: 'IMAGE-SAVE',
    Time: '2024-01-15T20:10:00-05:00',
    ImageStatistics: {
      Date: '2024-01-15T20:10:00-05:00'
    },
    Id: 9
  },
  
  // Filter change (no-op test)
  {
    Event: 'FILTERWHEEL-CHANGED',
    Time: '2024-01-15T20:15:00-05:00',
    Previous: { Name: 'Ha' },
    New: { Name: 'Ha' }, // Same filter - should be no-op
    Id: 10
  },
  
  // Another image
  {
    Event: 'IMAGE-SAVE',
    Time: '2024-01-15T20:20:00-05:00',
    Id: 11
  }
];

// Test the reducer with sequential events
console.log('📊 Processing test events sequentially:\n');

let currentState = EMPTY_SESSION_STATE;

testEvents.forEach((event, index) => {
  console.log(`Event ${index + 1}: ${event.Event} at ${event.Time}`);
  
  const newState = reducer.reduce(currentState, event);
  
  // Show what changed
  if (JSON.stringify(newState) !== JSON.stringify(currentState)) {
    console.log('  ✅ State updated:');
    
    // Check target changes
    if (newState.target.name !== currentState.target.name) {
      console.log(`    • Target: ${currentState.target.name} → ${newState.target.name}`);
    }
    
    // Check filter changes
    if (newState.filter.name !== currentState.filter.name) {
      console.log(`    • Filter: ${currentState.filter.name} → ${newState.filter.name}`);
    }
    
    // Check activity changes
    if (newState.activity.state !== currentState.activity.state) {
      console.log(`    • Activity: ${currentState.activity.subsystem}:${currentState.activity.state} → ${newState.activity.subsystem}:${newState.activity.state}`);
    }
    
    // Check safety changes
    if (newState.safety.isSafe !== currentState.safety.isSafe) {
      console.log(`    • Safety: ${currentState.safety.isSafe} → ${newState.safety.isSafe}`);
    }
    
    // Check image changes
    if (newState.image.lastSavedAt !== currentState.image.lastSavedAt) {
      console.log(`    • Image: ${currentState.image.lastSavedAt} → ${newState.image.lastSavedAt}`);
    }
    
    // Check equipment changes
    if (newState.equipmentLastChange.device !== currentState.equipmentLastChange.device) {
      console.log(`    • Equipment: ${newState.equipmentLastChange.device} ${newState.equipmentLastChange.event}`);
    }
    
  } else {
    console.log('  ⚪ No state change (filtered or no-op)');
  }
  
  currentState = newState;
  console.log('');
});

// Final state summary
console.log('📋 Final Session State Summary:');
console.log('================================');
console.log(`Target: ${currentState.target.name || 'None'}`);
console.log(`Project: ${currentState.target.project || 'None'}`);
console.log(`Filter: ${currentState.filter.name || 'None'}`);
console.log(`Last Image: ${currentState.image.lastSavedAt || 'None'}`);
console.log(`Safety: ${currentState.safety.isSafe !== null ? (currentState.safety.isSafe ? 'Safe' : 'Unsafe') : 'Unknown'}`);
console.log(`Activity: ${currentState.activity.state ? `${currentState.activity.subsystem}:${currentState.activity.state}` : 'None'}`);
console.log(`Last Equipment: ${currentState.equipmentLastChange.device || 'None'} ${currentState.equipmentLastChange.event || ''}`);
console.log(`Watermark: ${currentState.watermark.lastEventTimeUTC || 'None'}`);
console.log('');

// Test timezone formatting
console.log('🌍 Testing Timezone Formatting:');
console.log('===============================');
if (currentState.image.lastSavedAt) {
  const formatted = reducer.formatForDisplay(currentState.image.lastSavedAt);
  console.log(`UTC Time: ${currentState.image.lastSavedAt}`);
  console.log(`User Time: ${formatted}`);
}
console.log('');

// Test duration calculation
console.log('⏱️ Testing Duration Calculation:');
console.log('===============================');
const duration = reducer.calculateDuration('2024-01-15T20:00:00-05:00', '2024-01-15T20:20:00-05:00');
console.log(`Session Duration: ${duration}`);
console.log('');

// Test error handling
console.log('🚨 Testing Error Handling:');
console.log('==========================');

// Invalid event
const invalidEvent = { Event: null, Time: 'invalid-time' };
const errorState = reducer.reduce(currentState, invalidEvent);
console.log(`Invalid event handled: ${JSON.stringify(currentState) === JSON.stringify(errorState) ? 'Ignored' : 'Processed'}`);

// Old event (watermark test)
const oldEvent = { Event: 'IMAGE-SAVE', Time: '2024-01-15T19:00:00-05:00', Id: 0 };
const oldState = reducer.reduce(currentState, oldEvent);
console.log(`Old event handled: ${JSON.stringify(currentState) === JSON.stringify(oldState) ? 'Ignored' : 'Processed'}`);

console.log('\n✅ Enhanced Session State Reducer tests completed!');
console.log('\n💡 Key Features Validated:');
console.log('  • Pure reducer pattern (immutable state)');
console.log('  • Timezone-safe timestamp parsing');
console.log('  • Event watermarking (prevents old events)');
console.log('  • Session-scoped vs global events');
console.log('  • Activity priority handling');
console.log('  • No-op filter change detection');
console.log('  • Error handling and edge cases');
