#!/usr/bin/env node
/**
 * Simple validation script for the discrete location system
 */

import { defaultLocations } from '../data/locations.ts';

const MAP_WIDTH = 48;
const MAP_HEIGHT = 32;

console.log('\n🧪 Validating Discrete Location System...\n');
console.log('='.repeat(60));

// Test 1: Check if locations exist
console.log('\n✓ Test 1: Location Data Exists');
if (!defaultLocations || defaultLocations.length === 0) {
  console.error('❌ FAIL: No locations defined');
  process.exit(1);
}
console.log(`  ✅ Found ${defaultLocations.length} locations`);

// Test 2: Validate required fields
console.log('\n✓ Test 2: Required Fields');
let fieldErrors = 0;
defaultLocations.forEach((location, index) => {
  const missing = [];
  if (!location.id) missing.push('id');
  if (!location.name) missing.push('name');
  if (!location.description) missing.push('description');
  if (!location.position) missing.push('position');
  if (!location.type) missing.push('type');

  if (missing.length > 0) {
    console.error(`  ❌ Location ${index}: Missing ${missing.join(', ')}`);
    fieldErrors++;
  }
});
if (fieldErrors === 0) {
  console.log('  ✅ All locations have required fields');
} else {
  console.error(`  ❌ FAIL: ${fieldErrors} locations with missing fields`);
  process.exit(1);
}

// Test 3: Check unique IDs
console.log('\n✓ Test 3: Unique IDs');
const ids = defaultLocations.map((loc) => loc.id);
const uniqueIds = new Set(ids);
if (uniqueIds.size !== ids.length) {
  console.error('  ❌ FAIL: Duplicate location IDs found');
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  console.error(`  Duplicates: ${duplicates.join(', ')}`);
  process.exit(1);
}
console.log('  ✅ All location IDs are unique');

// Test 4: Validate map bounds
console.log('\n✓ Test 4: Map Bounds');
let boundsErrors = 0;
defaultLocations.forEach((location) => {
  const { x, y } = location.position;
  if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
    console.error(`  ❌ ${location.id}: Out of bounds (${x}, ${y})`);
    boundsErrors++;
  }
});
if (boundsErrors === 0) {
  console.log(`  ✅ All locations within ${MAP_WIDTH}x${MAP_HEIGHT} bounds`);
} else {
  console.error(`  ❌ FAIL: ${boundsErrors} locations out of bounds`);
  process.exit(1);
}

// Test 5: Validate location types
console.log('\n✓ Test 5: Location Types');
const validTypes = ['social', 'work', 'leisure', 'public'];
let typeErrors = 0;
defaultLocations.forEach((location) => {
  if (!validTypes.includes(location.type)) {
    console.error(`  ❌ ${location.id}: Invalid type "${location.type}"`);
    typeErrors++;
  }
});
if (typeErrors === 0) {
  console.log('  ✅ All location types are valid');
} else {
  console.error(`  ❌ FAIL: ${typeErrors} invalid types`);
  process.exit(1);
}

// Test 6: Check for default location
console.log('\n✓ Test 6: Default Location');
const townSquare = defaultLocations.find((loc) => loc.id === 'town_square');
if (!townSquare) {
  console.error('  ❌ FAIL: Missing default location "town_square"');
  process.exit(1);
}
console.log('  ✅ Default location "town_square" exists');

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(60));

// Type distribution
const typeCounts = {};
defaultLocations.forEach((loc) => {
  typeCounts[loc.type] = (typeCounts[loc.type] || 0) + 1;
});

console.log('\n📈 Type Distribution:');
validTypes.forEach((type) => {
  const count = typeCounts[type] || 0;
  const bar = '█'.repeat(count);
  console.log(`  ${type.padEnd(10)}: ${bar} (${count})`);
});

// Location list
console.log('\n📍 Location Details:');
console.log('─'.repeat(60));

const icons = {
  town_square: '🏛️',
  cafe: '☕',
  library: '📚',
  park: '🌳',
  office: '💼',
  market: '🛒',
  garden: '🌺',
  community_center: '🏘️',
};

defaultLocations.forEach((location) => {
  const icon = icons[location.id] || '📍';
  const pos = `(${location.position.x}, ${location.position.y})`;
  console.log(`${icon} ${location.name.padEnd(12)} [${location.type.padEnd(8)}] ${pos.padEnd(10)}`);
  console.log(`   ${location.description}`);
  console.log('');
});

console.log('='.repeat(60));
console.log('✅ ALL VALIDATION TESTS PASSED!');
console.log('='.repeat(60));
console.log('');
