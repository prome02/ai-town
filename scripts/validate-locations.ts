#!/usr/bin/env ts-node
/**
 * Validation script for the discrete location system
 * Run with: npx ts-node scripts/validate-locations.ts
 */

import { defaultLocations } from '../data/locations.js';

const MAP_WIDTH = 48;
const MAP_HEIGHT = 32;

console.log('🧪 Validating Discrete Location System...\n');

// Test 1: Check if locations exist
console.log('✓ Test 1: Location data exists');
if (!defaultLocations || defaultLocations.length === 0) {
  console.error('❌ FAIL: No locations defined');
  process.exit(1);
}
console.log(`  Found ${defaultLocations.length} locations\n`);

// Test 2: Validate required fields
console.log('✓ Test 2: Validating required fields');
let fieldErrors = 0;
defaultLocations.forEach((location, index) => {
  if (!location.id) {
    console.error(`  ❌ Location ${index} missing id`);
    fieldErrors++;
  }
  if (!location.name) {
    console.error(`  ❌ Location ${index} missing name`);
    fieldErrors++;
  }
  if (!location.description) {
    console.error(`  ❌ Location ${index} missing description`);
    fieldErrors++;
  }
  if (!location.position || location.position.x === undefined || location.position.y === undefined) {
    console.error(`  ❌ Location ${location.id} missing valid position`);
    fieldErrors++;
  }
  if (!location.type) {
    console.error(`  ❌ Location ${location.id} missing type`);
    fieldErrors++;
  }
});
if (fieldErrors === 0) {
  console.log('  All locations have required fields\n');
} else {
  console.error(`  ❌ FAIL: ${fieldErrors} field errors\n`);
  process.exit(1);
}

// Test 3: Check unique IDs
console.log('✓ Test 3: Checking unique location IDs');
const ids = defaultLocations.map((loc) => loc.id);
const uniqueIds = new Set(ids);
if (uniqueIds.size !== ids.length) {
  console.error('  ❌ FAIL: Duplicate location IDs found');
  process.exit(1);
}
console.log('  All location IDs are unique\n');

// Test 4: Validate map bounds
console.log('✓ Test 4: Validating map bounds');
let boundsErrors = 0;
defaultLocations.forEach((location) => {
  if (
    location.position.x < 0 ||
    location.position.x >= MAP_WIDTH ||
    location.position.y < 0 ||
    location.position.y >= MAP_HEIGHT
  ) {
    console.error(
      `  ❌ Location ${location.id} out of bounds: (${location.position.x}, ${location.position.y})`,
    );
    boundsErrors++;
  }
});
if (boundsErrors === 0) {
  console.log(`  All locations within map bounds (${MAP_WIDTH} x ${MAP_HEIGHT})\n`);
} else {
  console.error(`  ❌ FAIL: ${boundsErrors} locations out of bounds\n`);
  process.exit(1);
}

// Test 5: Validate location types
console.log('✓ Test 5: Validating location types');
const validTypes = ['social', 'work', 'leisure', 'public'];
let typeErrors = 0;
defaultLocations.forEach((location) => {
  if (!validTypes.includes(location.type)) {
    console.error(`  ❌ Location ${location.id} has invalid type: ${location.type}`);
    typeErrors++;
  }
});
if (typeErrors === 0) {
  console.log('  All location types are valid\n');
} else {
  console.error(`  ❌ FAIL: ${typeErrors} invalid types\n`);
  process.exit(1);
}

// Test 6: Check for default location
console.log('✓ Test 6: Checking for default location (town_square)');
const townSquare = defaultLocations.find((loc) => loc.id === 'town_square');
if (!townSquare) {
  console.error('  ❌ FAIL: Missing default location "town_square"');
  process.exit(1);
}
console.log('  Default location "town_square" found\n');

// Test 7: Type distribution
console.log('✓ Test 7: Analyzing location type distribution');
const typeCounts = defaultLocations.reduce((acc, loc) => {
  acc[loc.type] = (acc[loc.type] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

console.log('  Location types:');
validTypes.forEach((type) => {
  const count = typeCounts[type] || 0;
  console.log(`    ${type.padEnd(10)}: ${count}`);
});
console.log('');

// Summary
console.log('━'.repeat(50));
console.log('📊 VALIDATION SUMMARY');
console.log('━'.repeat(50));
console.log(`Total locations: ${defaultLocations.length}`);
console.log(`Map bounds: ${MAP_WIDTH} x ${MAP_HEIGHT}`);
console.log('');
console.log('📍 Location List:');
defaultLocations.forEach((location) => {
  const icon =
    {
      town_square: '🏛️',
      cafe: '☕',
      library: '📚',
      park: '🌳',
      office: '💼',
      market: '🛒',
      garden: '🌺',
      community_center: '🏘️',
    }[location.id] || '📍';

  console.log(
    `  ${icon} ${location.name.padEnd(15)} (${location.type.padEnd(8)}) at (${location.position.x}, ${location.position.y})`,
  );
});

console.log('');
console.log('✅ ALL VALIDATION TESTS PASSED!');
console.log('━'.repeat(50));
