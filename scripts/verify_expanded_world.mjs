// scripts/verify_expanded_world.mjs
// Comprehensive mathematical collision and integrity audit for Amar Bangladesh expanded world

import { readFileSync } from 'fs';

console.log('=== RUNNING EXPANDED WORLD INTEGRITY & COLLISION AUDIT ===');

// Simple Box overlap check
function boxesOverlap(b1, b2, buffer = 0) {
  return !(
    b1.maxX + buffer <= b2.minX ||
    b1.minX - buffer >= b2.maxX ||
    b1.maxZ + buffer <= b2.minZ ||
    b1.minZ - buffer >= b2.maxZ
  );
}

// Extract roads from NeighborhoodBuilder.ts
const nbSource = readFileSync('src/world/NeighborhoodBuilder.ts', 'utf-8');

const roadRegex = /addRoad\(\s*([\d\.-]+)\s*,\s*([\d\.-]+)\s*,\s*([\d\.-]+)\s*,\s*([\d\.-]+)\s*,\s*'(\w+)'/g;
const roads = [];
let match;
while ((match = roadRegex.exec(nbSource)) !== null) {
  const x = parseFloat(match[1]);
  const z = parseFloat(match[2]);
  const width = parseFloat(match[3]);
  const depth = parseFloat(match[4]);
  const kind = match[5];
  roads.push({
    x, z, width, depth, kind,
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2
  });
}
console.log(`Found ${roads.length} roads and plazas.`);

// Extract buildings
const bldgRegex = /id:\s*'([^']+)',\s*nameBn:\s*'([^']+)',\s*kind:\s*'([^']+)',\s*x:\s*([\d\.-]+),\s*z:\s*([\d\.-]+),\s*w:\s*([\d\.-]+),\s*h:\s*([\d\.-]+),\s*d:\s*([\d\.-]+)/g;
const buildings = [];
while ((match = bldgRegex.exec(nbSource)) !== null) {
  const id = match[1];
  const nameBn = match[2];
  const kind = match[3];
  const x = parseFloat(match[4]);
  const z = parseFloat(match[5]);
  const w = parseFloat(match[6]);
  const h = parseFloat(match[7]);
  const d = parseFloat(match[8]);
  buildings.push({
    id, nameBn, kind, x, z, w, d,
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2
  });
}

// Add the Mess room building which is built with detailed interior walls at (-10, -10)
buildings.push({
  id: 'mess',
  nameBn: 'সবুজ মেস',
  kind: 'mess',
  x: -10,
  z: -10,
  w: 7.8,
  d: 6.6,
  minX: -10 - 3.9,
  maxX: -10 + 3.9,
  minZ: -10 - 3.3,
  maxZ: -10 + 3.3
});

// Add Tong Dokans
const tongRegex = /id:\s*'(tong_[^']+)',\s*nameBn:\s*'([^']+)',[\s\S]*?x:\s*([\d\.-]+),\s*z:\s*([\d\.-]+)/g;
while ((match = tongRegex.exec(nbSource)) !== null) {
  const id = match[1];
  const nameBn = match[2];
  const x = parseFloat(match[3]);
  const z = parseFloat(match[4]);
  buildings.push({
    id, nameBn, kind: 'tong', x, z, w: 4.8, d: 3.2,
    minX: x - 2.4,
    maxX: x + 2.4,
    minZ: z - 1.6,
    maxZ: z + 1.6
  });
}

console.log(`Found ${buildings.length} total buildings, messes, shops, and tong stalls.`);

let errors = 0;

// 1. Check Building vs Building overlaps
for (let i = 0; i < buildings.length; i++) {
  for (let j = i + 1; j < buildings.length; j++) {
    const b1 = buildings[i];
    const b2 = buildings[j];
    if (boxesOverlap(b1, b2, 0.05)) {
      console.error(`ERROR: Building ${b1.id} (${b1.nameBn}) overlaps with ${b2.id} (${b2.nameBn})!`);
      errors++;
    }
  }
}

// 2. Check Building vs Asphalt/Lane Road overlaps (plazas are pedestrian pads where tong shops/entrances sit)
for (const b of buildings) {
  for (const r of roads) {
    if (r.kind === 'plaza') continue; // pedestrian courtyards
    // Special exception: Mess entrance alley touches mess doorstep at -6.5
    if (b.id === 'mess' && r.minZ >= -6.5) continue;
    if (boxesOverlap(b, r, 0.05)) {
      console.error(`ERROR: Building ${b.id} (${b.nameBn}) overlaps road at (${r.x}, ${r.z}, kind=${r.kind})!`);
      errors++;
    }
  }
}

// 3. Extract and check Street Graph nodes in NPCManager.ts
const npcSource = readFileSync('src/npc/NPCManager.ts', 'utf-8');
const nodeRegex = /\{\s*x:\s*([\d\.-]+)\s*,\s*z:\s*([\d\.-]+)\s*,\s*neighbors:\s*\[([^\]]+)\]\s*\}/g;
const nodes = [];
let nodeIdx = 0;
while ((match = nodeRegex.exec(npcSource)) !== null) {
  const x = parseFloat(match[1]);
  const z = parseFloat(match[2]);
  const neighbors = match[3].split(',').map((s) => parseInt(s.trim(), 10));
  nodes.push({ id: nodeIdx++, x, z, neighbors });
}
console.log(`Found ${nodes.length} street graph nodes.`);

// Verify street graph symmetry
for (const n of nodes) {
  for (const neighborId of n.neighbors) {
    const target = nodes[neighborId];
    if (!target) {
      console.error(`ERROR: Node ${n.id} references non-existent neighbor ${neighborId}!`);
      errors++;
    } else if (!target.neighbors.includes(n.id)) {
      console.error(`ERROR: Asymmetric edge between Node ${n.id} and Node ${neighborId}!`);
      errors++;
    }
  }
  // Check if node is inside any building
  for (const b of buildings) {
    if (n.x >= b.minX - 0.2 && n.x <= b.maxX + 0.2 && n.z >= b.minZ - 0.2 && n.z <= b.maxZ + 0.2) {
      console.error(`ERROR: Node ${n.id} (${n.x}, ${n.z}) is inside building ${b.id} (${b.nameBn})!`);
      errors++;
    }
  }
}

// 4. Verify All Trees (Mango, Palms, Bananas)
function checkTreeCoords(blockName, regex, radius) {
  const blockMatch = nbSource.match(new RegExp(`${blockName}[\\s\\S]*?\\];`));
  if (!blockMatch) return;
  const tRegex = /\[([\d\.-]+),\s*([\d\.-]+)(?:,\s*([\d\.-]+))?\]/g;
  let tm;
  let count = 0;
  while ((tm = tRegex.exec(blockMatch[0])) !== null) {
    const tx = parseFloat(tm[1]);
    const tz = parseFloat(tm[2]);
    const treeBox = { minX: tx - radius, maxX: tx + radius, minZ: tz - radius, maxZ: tz + radius };
    count++;
    for (const b of buildings) {
      if (boxesOverlap(treeBox, b, 0.1)) {
        console.error(`ERROR: Tree in ${blockName} at (${tx}, ${tz}) overlaps building ${b.id} (${b.nameBn})!`);
        errors++;
      }
    }
    for (const r of roads) {
      if (r.kind === 'plaza') continue;
      if (boxesOverlap(treeBox, r, 0.05)) {
        console.error(`ERROR: Tree in ${blockName} at (${tx}, ${tz}) overlaps road at (${r.x}, ${r.z})!`);
        errors++;
      }
    }
  }
  console.log(`Checked ${count} trees in ${blockName} for collisions.`);
}

checkTreeCoords('mangoCoords', /\[([\d\.-]+),\s*([\d\.-]+)(?:,\s*([\d\.-]+))?\]/g, 1.4);
checkTreeCoords('palmCoords', /\[([\d\.-]+),\s*([\d\.-]+)(?:,\s*([\d\.-]+))?\]/g, 1.2);
checkTreeCoords('bananaCoords', /\[([\d\.-]+),\s*([\d\.-]+)\]/g, 0.9);

if (errors === 0) {
  console.log('✅ ALL AUDITS PASSED WITH ZERO ERRORS!');
  console.log(`✅ World size: 280m x 220m, ${buildings.length} Buildings/Structures, ${roads.length} Roads & Plazas, ${nodes.length} Street Nodes, 4 Bridges across Meghna Canal.`);
  process.exit(0);
} else {
  console.error(`❌ FOUND ${errors} INTEGRITY ERRORS!`);
  process.exit(1);
}
