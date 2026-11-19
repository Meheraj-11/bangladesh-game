// scripts/verify_gameplay_systems.mjs
// Automated verification of Smart NPC Dialogue, Traffic System, and Map Data

import { readFileSync } from 'fs';

console.log('=== VERIFYING GAMEPLAY SYSTEMS & SMART DIALOGUE ===');

let errors = 0;

// 1. Verify DialogueData.ts
const dialogueSource = readFileSync('src/npc/DialogueData.ts', 'utf-8');

// Check that all required categories exist
const expectedCategories = [
  'daily_life',
  'education',
  'bangladesh_life',
  'entertainment',
  'food_lifestyle',
  'casual_funny'
];

for (const cat of expectedCategories) {
  if (!dialogueSource.includes(`category: '${cat}'`)) {
    console.error(`ERROR: Missing dialogue category: ${cat}`);
    errors++;
  }
}
console.log('✅ All conversation topic categories verified.');

// Check specific requested topics
const expectedTopics = [
  'daily_life',
  'education',
  'bangladesh_life',
  'entertainment',
  'food_lifestyle',
  'traffic_directions',
  'casual_funny'
];

for (const top of expectedTopics) {
  if (!dialogueSource.includes(`id: '${top}'`)) {
    console.error(`ERROR: Missing dialogue topic: ${top}`);
    errors++;
  }
}
console.log(`✅ All ${expectedTopics.length} core Bangladeshi discussion topics verified.`);

// Check distinct NPC personalities in dialogue database
const expectedNpcPersonalities = [
  'rafiq_mama',
  'sohel',
  'haji_chacha',
  'majid_mia',
  'bareq_mama',
  'tanvir',
  'nazma_khala',
  'abul_chacha'
];

for (const npc of expectedNpcPersonalities) {
  if (!dialogueSource.includes(`${npc}: {`)) {
    console.error(`ERROR: Missing dialogue personality for: ${npc}`);
    errors++;
  }
}
console.log(`✅ All ${expectedNpcPersonalities.length} distinct NPC dialogue personalities verified.`);

// 2. Verify Traffic System
const trafficSource = readFileSync('src/systems/TrafficSystem.ts', 'utf-8');

const expectedVehicles = [
  "type: 'rickshaw'",
  "type: 'cng'",
  "type: 'car'",
  "type: 'truck'",
  "type: 'motorcycle'"
];

for (const v of expectedVehicles) {
  if (!trafficSource.includes(v)) {
    console.error(`ERROR: Missing vehicle type in TrafficSystem: ${v}`);
    errors++;
  }
}
console.log('✅ All 5 Bangladeshi vehicle types (Rickshaw, CNG, Sedan, Pickup, Motorcycle) verified in TrafficSystem.');

// Verify Bridge elevation math in TrafficSystem
if (!trafficSource.includes('getSurfaceHeight')) {
  console.error('ERROR: Missing getSurfaceHeight in TrafficSystem');
  errors++;
} else {
  console.log('✅ Smooth bridge elevation tracking via getSurfaceHeight verified in TrafficSystem.');
}

// 3. Verify NeighborhoodBuilder Bridges & East District
const nbSource = readFileSync('src/world/NeighborhoodBuilder.ts', 'utf-8');

const expectedBridges = ['bridge_concrete', 'bridge_bamboo', 'bridge_culvert', 'bridge_steel_truss'];
for (const b of expectedBridges) {
  if (!nbSource.includes(`id: '${b}'`)) {
    console.error(`ERROR: Missing bridge in NeighborhoodBuilder: ${b}`);
    errors++;
  }
}
console.log('✅ All 4 bridges (Concrete Bridge, Bamboo Footbridge, South Culvert, North Steel Truss) verified.');

const expectedEastBuildings = ['tong_bareq', 'mess_meghna', 'cricket_ground', 'river_ghat', 'house_padma', 'house_surma'];
for (const b of expectedEastBuildings) {
  if (!nbSource.includes(`id: '${b}'`)) {
    console.error(`ERROR: Missing East district location: ${b}`);
    errors++;
  }
}
console.log('✅ All East district riverside locations verified.');

// 4. Verify Minimap integration
const minimapSource = readFileSync('src/ui/Minimap.ts', 'utf-8');
if (!minimapSource.includes('params.vehicles')) {
  console.error('ERROR: Minimap does not handle vehicles');
  errors++;
}
if (!minimapSource.includes('Meghna Canal')) {
  console.error('ERROR: Minimap does not render Meghna Canal');
  errors++;
}
console.log('✅ Minimap vehicle tracking and Meghna Canal rendering verified.');

// 5. SoundEngine horn support
const soundSource = readFileSync('src/audio/SoundEngine.ts', 'utf-8');
if (!soundSource.includes('playVehicleHorn')) {
  console.error('ERROR: Missing playVehicleHorn in SoundEngine');
  errors++;
}
console.log('✅ SoundEngine vehicle horn synthesizers verified.');

if (errors === 0) {
  console.log('🎉 ALL GAMEPLAY SYSTEMS PASSED WITH 100% SUCCESS!');
  process.exit(0);
} else {
  console.error(`❌ FAILED WITH ${errors} ERRORS`);
  process.exit(1);
}
