// Simple test of the conversion logic without database dependencies

console.log('🧪 Testing session state conversion logic...\n');

// Helper function to convert dates to strings safely
const safeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return null;
};

// Helper function to ensure boolean values are converted to SQLite integers
const safeBool = (value) => {
  if (value === null || value === undefined) return null;
  return Boolean(value) ? 1 : 0;
};

// Helper function to ensure numeric values
const safeNumber = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
};

function convertToDbFormat(sessionData) {
  return {
    current_session_uuid: `session_${Date.now()}`,
    target_name: sessionData.target?.name || null,
    project_name: sessionData.target?.project || null,
    coordinates: sessionData.target?.coordinates ? JSON.stringify(sessionData.target.coordinates) : null,
    rotation: safeNumber(sessionData.target?.rotation),
    current_filter: sessionData.filter?.name || null,
    last_image_data: sessionData.lastImage ? JSON.stringify(sessionData.lastImage) : null,
    is_safe: sessionData.safe?.isSafe ? safeBool(sessionData.safe.isSafe) : null,
    safety_time: safeDate(sessionData.safe?.time),
    activity_subsystem: sessionData.activity?.subsystem || null,
    activity_state: sessionData.activity?.state || null,
    activity_since: safeDate(sessionData.activity?.since),
    last_equipment_change: sessionData.lastEquipmentChange ? JSON.stringify(sessionData.lastEquipmentChange) : null,
    flats_active: safeBool(sessionData.flats?.isActive),
    flats_filter: sessionData.flats?.filter || null,
    flats_brightness: safeNumber(sessionData.flats?.brightness),
    flats_count: safeNumber(sessionData.flats?.imageCount) || 0,
    flats_started_at: safeDate(sessionData.flats?.startedAt),
    flats_last_image_at: safeDate(sessionData.flats?.lastImageAt),
    darks_active: safeBool(sessionData.darks?.isActive),
    darks_exposure_time: safeNumber(sessionData.darks?.currentExposureTime),
    darks_exposure_groups: sessionData.darks?.exposureGroups ? JSON.stringify(sessionData.darks.exposureGroups) : null,
    darks_total_images: safeNumber(sessionData.darks?.totalImages) || 0,
    darks_started_at: safeDate(sessionData.darks?.startedAt),
    darks_last_image_at: safeDate(sessionData.darks?.lastImageAt),
    session_start: safeDate(sessionData.sessionStart),
    is_session_active: safeBool(sessionData.isActive),
    last_update: new Date().toISOString()
  };
}

// Mock session data
const sessionData = {
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

console.log('📊 Original session data:');
console.log(JSON.stringify(sessionData, null, 2));

const dbFormat = convertToDbFormat(sessionData);
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

// Test individual helper functions
console.log('\n🧪 Helper function tests:');
console.log(`safeBool(true) = ${safeBool(true)} (${typeof safeBool(true)})`);
console.log(`safeBool(false) = ${safeBool(false)} (${typeof safeBool(false)})`);
console.log(`safeBool(null) = ${safeBool(null)} (${typeof safeBool(null)})`);
console.log(`safeBool(undefined) = ${safeBool(undefined)} (${typeof safeBool(undefined)})`);
console.log(`safeNumber(42) = ${safeNumber(42)} (${typeof safeNumber(42)})`);
console.log(`safeNumber("42") = ${safeNumber("42")} (${typeof safeNumber("42")})`);
console.log(`safeNumber(null) = ${safeNumber(null)} (${typeof safeNumber(null)})`);
