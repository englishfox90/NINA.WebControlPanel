const Database = require('better-sqlite3');

// Create a test database and schema
const db = new Database(':memory:');

// Create a simple test table
db.exec(`
  CREATE TABLE test (
    id INTEGER PRIMARY KEY,
    bool_val BOOLEAN,
    name TEXT
  )
`);

// Test different boolean representations
const testCases = [
  { bool_val: true, name: 'javascript_true' },
  { bool_val: false, name: 'javascript_false' },
  { bool_val: 1, name: 'number_1' },
  { bool_val: 0, name: 'number_0' },
  { bool_val: 'true', name: 'string_true' },
  { bool_val: 'false', name: 'string_false' },
];

for (const testCase of testCases) {
  try {
    const stmt = db.prepare('INSERT INTO test (bool_val, name) VALUES (@bool_val, @name)');
    const result = stmt.run(testCase);
    console.log(`✅ ${testCase.name}: SUCCESS`);
  } catch (error) {
    console.error(`❌ ${testCase.name}: ${error.message}`);
  }
}

db.close();
