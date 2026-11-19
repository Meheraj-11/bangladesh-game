/**
 * WorldPhysics.ts - Central Mathematical Elevation & Collision Authority
 *
 * Guarantees that:
 * 1. Player walking feet stay firmly and smoothly on top of every bridge deck.
 * 2. Cars, trucks, CNGs, and cycle rickshaws drive ON TOP of every bridge deck.
 * 3. NPCs walking on roads and bridges never clip, sink, or float.
 * 4. All 4 bridges have smooth, non-abrupt approach ramps and realistic deck elevations.
 */

export interface BridgeSpec {
  id: string;
  nameBn: string;
  nameEn: string;
  kind: 'concrete' | 'bamboo' | 'culvert' | 'steel_truss';
  centerX: number;
  centerZ: number;
  spanX: number; // total length along X
  minX: number;
  maxX: number;
  widthZ: number; // width along Z
  minZ: number;
  maxZ: number;
  apexY: number; // top surface elevation at apex
  baseY: number; // approach level (typically 0.04m)
  railHeight: number; // railing height above deck
  hasArch: boolean;
  getSurfaceY: (x: number, z: number) => number;
}

export const BRIDGES: BridgeSpec[] = [
  // 1. MAIN CONCRETE VEHICULAR BRIDGE (পাক্কা কংক্রিট আর্চ সেতু)
  {
    id: 'bridge_concrete',
    nameBn: 'পাক্কা কংক্রিট সেতু',
    nameEn: 'Main Concrete Bridge',
    kind: 'concrete',
    centerX: 63.0,
    centerZ: 2.0,
    spanX: 36.0,
    minX: 45.0,
    maxX: 81.0,
    widthZ: 8.6,
    minZ: 2.0 - 4.3, // -2.3
    maxZ: 2.0 + 4.3, // 6.3
    apexY: 1.12,
    baseY: 0.04,
    railHeight: 1.15,
    hasArch: true,
    getSurfaceY: (x: number, _z: number) => {
      // Approach ramps: 45 to 53 (West), 73 to 81 (East)
      // Central arch: 53 to 73
      if (x < 45.0 || x > 81.0) return 0.04;
      const mid = 63.0;
      const halfSpan = 18.0;
      const norm = (x - mid) / halfSpan; // -1 to +1
      const arch = Math.max(0, 1 - norm * norm);
      // Smooth cosine-parabolic curve for realistic bridge arch
      return 0.04 + arch * 1.08;
    }
  },

  // 2. TRADITIONAL BAMBOO FOOTBRIDGE (গ্রামীণ বাঁশের সাঁকো)
  {
    id: 'bridge_bamboo',
    nameBn: 'বাঁশের সাঁকো ও কাঠের সেতু',
    nameEn: 'Village Bamboo Footbridge',
    kind: 'bamboo',
    centerX: 63.0,
    centerZ: -36.0,
    spanX: 32.0,
    minX: 47.0,
    maxX: 79.0,
    widthZ: 3.2,
    minZ: -36.0 - 1.6, // -37.6
    maxZ: -36.0 + 1.6, // -34.4
    apexY: 0.44,
    baseY: 0.04,
    railHeight: 1.05,
    hasArch: false,
    getSurfaceY: (x: number, _z: number) => {
      if (x < 47.0 || x > 79.0) return 0.04;
      // Gentle slope on ramps, flat plank deck over canal (53 to 73)
      if (x < 53.0) {
        const t = (x - 47.0) / 6.0;
        return 0.04 + t * 0.40;
      }
      if (x > 73.0) {
        const t = (79.0 - x) / 6.0;
        return 0.04 + t * 0.40;
      }
      return 0.44;
    }
  },

  // 3. SOUTH CULVERT VEHICULAR BRIDGE (দক্ষিণ কালভার্ট সেতু)
  {
    id: 'bridge_culvert',
    nameBn: 'দক্ষিণ কালভার্ট সেতু',
    nameEn: 'South Culvert Bridge',
    kind: 'culvert',
    centerX: 63.0,
    centerZ: 39.2,
    spanX: 30.0,
    minX: 48.0,
    maxX: 78.0,
    widthZ: 7.6,
    minZ: 39.2 - 3.8, // 35.4
    maxZ: 39.2 + 3.8, // 43.0
    apexY: 0.32,
    baseY: 0.04,
    railHeight: 0.95,
    hasArch: false,
    getSurfaceY: (x: number, _z: number) => {
      if (x < 48.0 || x > 78.0) return 0.04;
      // Smooth asphalt transition onto culvert deck (52 to 74)
      if (x < 53.0) {
        const t = (x - 48.0) / 5.0;
        return 0.04 + t * 0.28;
      }
      if (x > 73.0) {
        const t = (78.0 - x) / 5.0;
        return 0.04 + t * 0.28;
      }
      return 0.32;
    }
  },

  // 4. NORTH STEEL TRUSS BRIDGE (উত্তর স্টিল ট্রাস সেতু)
  {
    id: 'bridge_steel_truss',
    nameBn: 'উত্তর স্টিল ট্রাস সেতু',
    nameEn: 'North Steel Truss Bridge',
    kind: 'steel_truss',
    centerX: 63.0,
    centerZ: -68.0,
    spanX: 36.0,
    minX: 45.0,
    maxX: 81.0,
    widthZ: 8.2,
    minZ: -68.0 - 4.1, // -72.1
    maxZ: -68.0 + 4.1, // -63.9
    apexY: 1.25,
    baseY: 0.04,
    railHeight: 1.25,
    hasArch: true,
    getSurfaceY: (x: number, _z: number) => {
      if (x < 45.0 || x > 81.0) return 0.04;
      const mid = 63.0;
      const halfSpan = 18.0;
      const norm = (x - mid) / halfSpan;
      const arch = Math.max(0, 1 - norm * norm);
      return 0.04 + arch * 1.21;
    }
  }
];

/**
 * Returns the exact walking / driving surface elevation (Y) for any world (X, Z).
 * Handles flat ground, approach ramps, bridge arches, and elevated decks.
 */
export function getSurfaceHeight(x: number, z: number): number {
  for (let i = 0; i < BRIDGES.length; i++) {
    const b = BRIDGES[i];
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
      return b.getSurfaceY(x, z);
    }
  }
  // Default flat street level
  return 0.04;
}

/**
 * Checks if coordinate is in the canal water zone (and NOT safely on a bridge deck).
 */
export function isDeepWater(x: number, z: number): boolean {
  // Canal runs North-South at x = 58 to 74
  if (x < 58.0 || x > 74.0) return false;
  // If on ANY bridge, not in water!
  for (let i = 0; i < BRIDGES.length; i++) {
    const b = BRIDGES[i];
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
      return false;
    }
  }
  // At River Ghat stone landing steps (x: 71 to 76, z: -14 to -6), accessible water edge
  if (x >= 71.0 && x <= 76.0 && z >= -14.0 && z <= -6.0) {
    return false;
  }
  return true;
}

/**
 * Returns bridge spec if point is currently on a bridge, else null.
 */
export function getActiveBridge(x: number, z: number): BridgeSpec | null {
  for (let i = 0; i < BRIDGES.length; i++) {
    const b = BRIDGES[i];
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
      return b;
    }
  }
  return null;
}
