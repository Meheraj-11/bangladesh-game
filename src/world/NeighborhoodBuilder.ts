import * as THREE from 'three';
import {
  BoxCollider,
  Interactable,
  MapBuilding,
  MapTree,
  NamedZone,
  RoadRect,
  WorldBounds
} from '../types';
import {
  createAsphaltTexture,
  createBengaliSignTexture,
  createBrickLaneTexture,
  createCorrugatedTinTexture,
  createKathaBedsheetTexture,
  createMosaicFloorTexture,
  createPlasterWallTexture,
  createTropicalGrassTexture
} from './textures';
import { buildAuthenticRickshaw } from '../systems/RickshawBuilder';

export interface WettableMat {
  mat: THREE.MeshStandardMaterial;
  dryRoughness: number;
  wetRoughness: number;
  dryColor: THREE.Color;
  wetColor: THREE.Color;
}

export interface WorldHandles {
  bounds: WorldBounds;
  messRoomBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  namedZones: NamedZone[];
  colliders: BoxCollider[];
  interactables: Interactable[];
  roads: RoadRect[];
  buildings: MapBuilding[];
  trees: MapTree[];
  ceilingFanRotor: THREE.Group;
  emergencyFanRotor: THREE.Group;
  emergencyFanLed: THREE.MeshStandardMaterial;
  roomLight: THREE.PointLight;
  roomTubeMat: THREE.MeshStandardMaterial;
  candleFlame: THREE.Group;
  candleLight: THREE.PointLight;
  coilEmberMat: THREE.MeshStandardMaterial;
  coilSmokeGroup: THREE.Group;
  phoneScreenMat: THREE.MeshStandardMaterial;
  powerBankLedMat: THREE.MeshStandardMaterial;
  tongLights: THREE.PointLight[];
  tongBulbMats: THREE.MeshStandardMaterial[];
  tongKupiLights: THREE.PointLight[];
  kettleSteamGroups: THREE.Group[];
  streetLights: THREE.PointLight[];
  streetBulbMats: THREE.MeshStandardMaterial[];
  houseWindowMat: THREE.MeshStandardMaterial;
  wettableMaterials: WettableMat[];
  mosquitoGroup: THREE.Group;
  swayingTrees: { obj: THREE.Object3D; phase: number; amp: number }[];
  rainSystem: THREE.LineSegments;
  rainMat: THREE.LineBasicMaterial;
  stars: THREE.Points;
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  ambientLight: THREE.AmbientLight;
}

export function buildNeighborhood(scene: THREE.Scene): WorldHandles {
  const colliders: BoxCollider[] = [];
  const interactables: Interactable[] = [];
  const roads: RoadRect[] = [];
  const buildings: MapBuilding[] = [];
  const trees: MapTree[] = [];
  const namedZones: NamedZone[] = [];
  const swayingTrees: { obj: THREE.Object3D; phase: number; amp: number }[] = [];
  const streetLights: THREE.PointLight[] = [];
  const streetBulbMats: THREE.MeshStandardMaterial[] = [];
  const tongLights: THREE.PointLight[] = [];
  const tongBulbMats: THREE.MeshStandardMaterial[] = [];
  const tongKupiLights: THREE.PointLight[] = [];
  const kettleSteamGroups: THREE.Group[] = [];
  const wettableMaterials: WettableMat[] = [];

  const bounds: WorldBounds = {
    minX: -140,
    maxX: 140,
    minZ: -110,
    maxZ: 110
  };

  const messRoomBounds = {
    minX: -13.6,
    maxX: -6.4,
    minZ: -13.0,
    maxZ: -6.9
  };

  // --- LIGHTING ---
  const hemiLight = new THREE.HemisphereLight(0xfff1d6, 0x2f4d36, 0.72);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.25);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xffe4b5, 1.5);
  sunLight.position.set(24, 34, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 4;
  sunLight.shadow.camera.far = 115;
  const shadowSpan = 36;
  sunLight.shadow.camera.left = -shadowSpan;
  sunLight.shadow.camera.right = shadowSpan;
  sunLight.shadow.camera.top = shadowSpan;
  sunLight.shadow.camera.bottom = -shadowSpan;
  sunLight.shadow.bias = -0.0008;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // Night Sky Stars
  const starGeo = new THREE.BufferGeometry();
  const starCount = 320;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.44;
    const r = 105;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) + 12;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xf8fafc,
    size: 0.7,
    transparent: true,
    opacity: 0
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // --- SHARED OPTIMIZED MATERIALS ---
  const grassTex = createTropicalGrassTexture();
  grassTex.repeat.set(24, 24);
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.96, metalness: 0.0 });
  wettableMaterials.push({
    mat: grassMat,
    dryRoughness: 0.96,
    wetRoughness: 0.56,
    dryColor: new THREE.Color(0xffffff),
    wetColor: new THREE.Color(0xc5d6c5)
  });

  const asphaltTex = createAsphaltTexture();
  asphaltTex.repeat.set(14, 1);
  const asphaltMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.88, metalness: 0.06 });
  wettableMaterials.push({
    mat: asphaltMat,
    dryRoughness: 0.88,
    wetRoughness: 0.2,
    dryColor: new THREE.Color(0xffffff),
    wetColor: new THREE.Color(0x9ca6b3)
  });

  const asphaltVertTex = createAsphaltTexture();
  asphaltVertTex.rotation = Math.PI / 2;
  asphaltVertTex.repeat.set(10, 1);
  const asphaltVertMat = new THREE.MeshStandardMaterial({ map: asphaltVertTex, roughness: 0.88, metalness: 0.06 });
  wettableMaterials.push({
    mat: asphaltVertMat,
    dryRoughness: 0.88,
    wetRoughness: 0.2,
    dryColor: new THREE.Color(0xffffff),
    wetColor: new THREE.Color(0x9ca6b3)
  });

  const brickTex = createBrickLaneTexture();
  brickTex.repeat.set(2, 8);
  const brickLaneMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.92, metalness: 0.04 });
  wettableMaterials.push({
    mat: brickLaneMat,
    dryRoughness: 0.92,
    wetRoughness: 0.28,
    dryColor: new THREE.Color(0xffffff),
    wetColor: new THREE.Color(0xb8a399)
  });

  const plazaMat = new THREE.MeshStandardMaterial({ color: 0x908b82, roughness: 0.92, metalness: 0.04 });
  wettableMaterials.push({
    mat: plazaMat,
    dryRoughness: 0.92,
    wetRoughness: 0.26,
    dryColor: new THREE.Color(0x908b82),
    wetColor: new THREE.Color(0x696d73)
  });

  const curbMat = new THREE.MeshStandardMaterial({ color: 0x8b867d, roughness: 0.9 });
  const grillMat = new THREE.MeshStandardMaterial({ color: 0x0f5132, metalness: 0.35, roughness: 0.55 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.78 });
  const tongWoodMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.85 });
  const tongBlueMat = new THREE.MeshStandardMaterial({ color: 0x155e75, roughness: 0.78 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x9a7b4f, roughness: 0.85 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.72, roughness: 0.28 });
  const tinMatBlue = new THREE.MeshStandardMaterial({
    map: createCorrugatedTinTexture('#2e6f95'),
    roughness: 0.55,
    metalness: 0.35
  });
  const tinMatGreen = new THREE.MeshStandardMaterial({
    map: createCorrugatedTinTexture('#1d6b52'),
    roughness: 0.55,
    metalness: 0.35
  });
  const boundaryBrickMat = new THREE.MeshStandardMaterial({ color: 0x9c5a43, roughness: 0.94 });
  const waterTankMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5 });

  // Shared emissive house windows — automatically glow warm amber at dusk/night, turn off during load shedding!
  const houseWindowMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0xffc864,
    emissiveIntensity: 0,
    roughness: 0.38
  });

  // --- GROUND PLANE ---
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(360, 300), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- CONNECTED ROAD & STREET NETWORK (ZERO OVERLAP WITH BUILDINGS) ---
  const addRoad = (
    x: number,
    z: number,
    w: number,
    d: number,
    kind: 'asphalt' | 'lane' | 'plaza',
    mat: THREE.Material,
    y = 0.03
  ) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), mat);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    scene.add(m);
    roads.push({ x, z, width: w, depth: d, kind });
  };

  // 1. Main Bazar Highway (East-West across entire 240m world, crosses Main Concrete Bridge at x = 45..81)
  addRoad(0, 2.0, 240, 5.2, 'asphalt', asphaltMat, 0.03);
  // 2. North Steel Truss Highway (East-West across 240m world, crosses North Steel Truss Bridge at x = 45..81)
  addRoad(0, -68.0, 240, 5.4, 'asphalt', asphaltMat, 0.03);
  // 3. North Cross Street (East-West)
  addRoad(-25.5, -20.0, 159, 4.2, 'asphalt', asphaltMat, 0.028);
  // 4. South Residential Road (East-West)
  addRoad(-25.5, 24.0, 159, 4.2, 'asphalt', asphaltMat, 0.028);
  // 5. Far North Residential Lane (East-West)
  addRoad(-20.5, -46.0, 149, 3.8, 'asphalt', asphaltMat, 0.027);
  // 6. South Culvert Highway (East-West across 240m world, crosses South Culvert Bridge at x = 48..78)
  addRoad(0, 39.2, 240, 5.2, 'asphalt', asphaltMat, 0.028);
  // 7. Far South Colony Road (East-West)
  addRoad(0, 65.0, 190, 4.2, 'asphalt', asphaltMat, 0.027);

  // 8. Far West Avenue (North-South along x = -95.0)
  addRoad(-95.0, -1.5, 4.5, 137, 'asphalt', asphaltVertMat, 0.025);
  // 9. West Mess Road (North-South along x = -26.0)
  addRoad(-26.0, -1.5, 4.2, 137, 'asphalt', asphaltVertMat, 0.025);
  // 10. East Bazar Street (North-South along x = 26.0)
  addRoad(26.0, -1.5, 4.2, 137, 'asphalt', asphaltVertMat, 0.025);
  // 11. West Extension Avenue (North-South along x = -54.0)
  addRoad(-54.0, -1.5, 4.2, 137, 'asphalt', asphaltVertMat, 0.025);
  // 12. East Extension Avenue (North-South along x = 54.0)
  addRoad(54.0, -1.5, 4.2, 137, 'asphalt', asphaltVertMat, 0.025);
  // 13. Central Connecting Brick Goli (North-South along x = 0.0)
  addRoad(0.0, -1.5, 3.8, 137, 'lane', brickLaneMat, 0.024);
  // 14. Mess Entrance Brick Alley (meets entrance step cleanly at z = -6.5)
  addRoad(-10.0, -2.25, 3.4, 8.5, 'lane', brickLaneMat, 0.032);

  // --- East Riverside & Agro District Roads ---
  // 15. East Riverside Promenade (North-South along riverbank x = 81.5)
  addRoad(81.5, -4.5, 5.2, 143, 'asphalt', asphaltVertMat, 0.025);
  // 16. East North Village Lane (East-West connecting to Bamboo footbridge)
  addRoad(95.5, -36.0, 28, 3.4, 'lane', brickLaneMat, 0.026);
  // 17. Far East Agro Avenue (North-South along x = 110.0)
  addRoad(110.0, -11.5, 4.5, 117, 'asphalt', asphaltVertMat, 0.025);

  // Open Courtyards & Plazas
  addRoad(10.0, -2.1, 6.8, 3.6, 'plaza', plazaMat, 0.033); // Mama's Tong pad
  addRoad(34.0, -2.2, 6.6, 3.6, 'plaza', plazaMat, 0.033); // Haji Chacha's Tong pad
  addRoad(18.8, 7.6, 6.2, 3.4, 'plaza', plazaMat, 0.033); // Bottola Pan-Cha Tong pad
  addRoad(-42.0, -2.1, 6.8, 3.6, 'plaza', plazaMat, 0.033); // Kashem's Tong pad
  addRoad(87.0, 7.2, 6.8, 4.4, 'plaza', plazaMat, 0.033); // Bareq Mama's Riverbank Tong pad
  addRoad(74.0, -10.0, 5.0, 10.0, 'plaza', plazaMat, 0.015); // River Ghat Stone Landing
  addRoad(93.0, 20.0, 22.0, 16.0, 'plaza', plazaMat, 0.02); // Cricket Pitch Ground
  addRoad(-8.2, 13.8, 9.6, 9.0, 'plaza', plazaMat, 0.032); // Banyan Tree Courtyard (বটতলা চত্বর)
  addRoad(-12.5, -25.2, 9.4, 5.4, 'plaza', plazaMat, 0.032); // Arunodoy Mess Courtyard
  addRoad(0.0, -42.0, 8.8, 6.4, 'plaza', plazaMat, 0.032); // North Park Plaza
  addRoad(-12.5, 42.0, 8.8, 6.4, 'plaza', plazaMat, 0.032); // South Community Plaza

  const addBox = (
    w: number,
    h: number,
    dSize: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    collide = false,
    castShadow = true
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, dSize), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (collide) {
      colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - dSize / 2,
        maxZ: z + dSize / 2
      });
    }
    return mesh;
  };

  // =========================================================================
  // 1. YOUR ENTERABLE MESS BUILDING (সবুজ ছাত্রাবাস - মেস) — PRESERVED AT (-10, -10)
  // =========================================================================
  const messExtMat = new THREE.MeshStandardMaterial({
    map: createPlasterWallTexture('#d6e5d8'),
    roughness: 0.9
  });
  const messIntMat = new THREE.MeshStandardMaterial({
    map: createPlasterWallTexture('#eef5ee', '#99c4b8'),
    roughness: 0.85
  });
  const wallThickness = 0.24;
  const roomH = 3.3;

  // Floor (mosaic tile)
  const mosaicTex = createMosaicFloorTexture();
  addBox(7.8, 0.14, 6.6, -10, 0.07, -10, new THREE.MeshStandardMaterial({ map: mosaicTex, roughness: 0.72 }), false, false);
  // Entrance concrete step
  addBox(2.4, 0.1, 0.8, -10, 0.05, -6.4, curbMat, false, false);

  // Room outer/inner walls leaving wide 2.0m doorway (-11 to -9 at z = -6.8)
  addBox(7.8, roomH, wallThickness, -10, roomH / 2 + 0.1, -13.2, messIntMat, true);
  addBox(wallThickness, roomH, 6.6, -13.8, roomH / 2 + 0.1, -10, messIntMat, true);
  addBox(wallThickness, roomH, 6.6, -6.2, roomH / 2 + 0.1, -10, messIntMat, true);
  addBox(2.8, roomH, wallThickness, -12.4, roomH / 2 + 0.1, -6.8, messExtMat, true);
  addBox(2.8, 1.05, wallThickness, -7.6, 0.62, -6.8, messExtMat, true);
  addBox(2.8, 0.85, wallThickness, -7.6, 2.98, -6.8, messExtMat, false);
  addBox(0.75, 1.5, wallThickness, -8.62, 1.85, -6.8, messExtMat, false);
  addBox(0.75, 1.5, wallThickness, -6.58, 1.85, -6.8, messExtMat, false);
  for (let gx = -8.1; gx <= -7.1; gx += 0.25) {
    addBox(0.035, 1.4, 0.04, gx, 1.85, -6.8, grillMat, false, false);
  }
  for (let gy = 1.4; gy <= 2.3; gy += 0.45) {
    addBox(1.3, 0.035, 0.04, -7.6, gy, -6.8, grillMat, false, false);
  }
  addBox(1.8, 0.12, 0.55, -7.6, 2.65, -6.48, curbMat, false);
  addBox(2.0, 0.72, wallThickness, -10.0, 3.04, -6.8, messExtMat, false);

  // Wooden door frame & open door
  addBox(0.1, 2.55, 0.28, -11.0, 1.4, -6.8, woodDark, false);
  addBox(0.1, 2.55, 0.28, -9.0, 1.4, -6.8, woodDark, false);
  const openDoor = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.45, 0.07), woodDark);
  openDoor.position.set(-10.95, 1.38, -7.45);
  openDoor.rotation.y = Math.PI * 0.42;
  openDoor.castShadow = true;
  scene.add(openDoor);

  // Ceiling, 2nd floor, balcony, laundry, water tank
  addBox(8.2, 0.22, 7.0, -10, 3.46, -10, new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.88 }), false);
  addBox(7.8, 3.1, 6.6, -10, 5.1, -10, messExtMat, false);
  addBox(8.0, 0.16, 1.25, -10, 3.55, -6.15, curbMat, false);
  addBox(8.0, 0.06, 0.06, -10, 4.45, -5.58, grillMat, false);
  for (let rx = -13.8; rx <= -6.2; rx += 0.65) {
    addBox(0.05, 0.85, 0.05, rx, 4.02, -5.58, grillMat, false, false);
  }
  addBox(0.65, 0.78, 0.08, -12.2, 4.1, -5.54, new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.9 }), false);
  addBox(0.55, 0.65, 0.08, -11.3, 4.14, -5.54, new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.9 }), false);
  addBox(1.5, 1.35, 0.12, -12.0, 5.2, -6.68, houseWindowMat, false);
  addBox(1.5, 1.35, 0.12, -8.0, 5.2, -6.68, houseWindowMat, false);
  addBox(8.1, 0.55, 0.22, -10, 6.9, -6.75, messExtMat, false);
  addBox(8.1, 0.55, 0.22, -10, 6.9, -13.25, messExtMat, false);

  const waterTankGeo = new THREE.CylinderGeometry(0.68, 0.68, 1.3, 12);
  const addWaterTank = (tx: number, ty: number, tz: number) => {
    const wt = new THREE.Mesh(waterTankGeo, waterTankMat);
    wt.position.set(tx, ty, tz);
    wt.castShadow = true;
    scene.add(wt);
  };
  addWaterTank(-12.2, 7.3, -11.4);

  const messSignTex = createBengaliSignTexture({
    bg: '#065f46',
    border: '#fde047',
    title: 'সবুজ ছাত্রাবাস (মেস)',
    subtitle: 'শান্তিপূর্ণ ছাত্রাবাস • বাসা নং ১২/ক',
    titleColor: '#fef9c3',
    subtitleColor: '#d1fae5',
    accentBar: '#047857'
  });
  const messSign = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.0, 0.1),
    new THREE.MeshStandardMaterial({ map: messSignTex, roughness: 0.55 })
  );
  messSign.position.set(-10, 3.95, -5.52);
  scene.add(messSign);

  buildings.push({
    id: 'mess',
    nameBn: 'সবুজ মেস',
    nameEn: 'Your Mess Room',
    x: -10,
    z: -10,
    width: 7.8,
    depth: 6.6,
    color: '#10b981',
    kind: 'mess'
  });

  namedZones.push({
    id: 'mess_room',
    label: '🏠 সবুজ মেস রুম • Mess Room',
    minX: messRoomBounds.minX,
    maxX: messRoomBounds.maxX,
    minZ: messRoomBounds.minZ,
    maxZ: messRoomBounds.maxZ,
    isMess: true
  });

  // --- MESS ROOM INTERIOR FURNITURE & SURVIVAL GEAR (PRESERVED) ---
  const fanMount = new THREE.Group();
  fanMount.position.set(-10, 3.35, -10);
  const fanRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6 })
  );
  fanRod.position.y = -0.22;
  fanMount.add(fanRod);

  const ceilingFanRotor = new THREE.Group();
  ceilingFanRotor.position.y = -0.46;
  const fanMotor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.2, 0.12, 14),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.3, roughness: 0.4 })
  );
  ceilingFanRotor.add(fanMotor);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.45 });
  for (let i = 0; i < 3; i++) {
    const bladePivot = new THREE.Group();
    bladePivot.rotation.y = (i * Math.PI * 2) / 3;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.02, 0.17), bladeMat);
    blade.position.x = 0.56;
    blade.rotation.x = 0.14;
    bladePivot.add(blade);
    ceilingFanRotor.add(bladePivot);
  }
  fanMount.add(ceilingFanRotor);
  scene.add(fanMount);

  const roomTubeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff8e1,
    emissiveIntensity: 1.4
  });
  const tubeFixture = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), roomTubeMat);
  tubeFixture.position.set(-10, 2.78, -13.02);
  scene.add(tubeFixture);

  const roomLight = new THREE.PointLight(0xfff4d6, 2.6, 13, 1.4);
  roomLight.position.set(-10, 2.65, -10.0);
  scene.add(roomLight);

  addBox(0.32, 0.22, 0.05, -8.75, 1.45, -6.96, new THREE.MeshStandardMaterial({ color: 0xf8fafc }), false, false);
  interactables.push({
    id: 'wall_switch',
    type: 'wall_switch',
    labelBn: 'রুম সুইচবোর্ড (লাইট/ফ্যান)',
    labelEn: 'Room Switchboard',
    icon: '🔌',
    position: new THREE.Vector3(-8.75, 1.2, -7.15),
    radius: 2.0,
    insideMess: true
  });

  const calTex = createBengaliSignTexture({
    bg: '#fffbeb',
    border: '#dc2626',
    title: 'বাংলা ক্যালেন্ডার',
    subtitle: 'শুভ সকাল • বাংলাদেশ',
    titleColor: '#006a4e',
    subtitleColor: '#991b1b',
    width: 256,
    height: 320
  });
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.85), new THREE.MeshStandardMaterial({ map: calTex }));
  poster.position.set(-13.65, 1.95, -9.2);
  poster.rotation.y = Math.PI / 2;
  scene.add(poster);

  // Bed
  const bedFrameMat = new THREE.MeshStandardMaterial({ color: 0x6b3f1d, roughness: 0.78 });
  const kathaMat = new THREE.MeshStandardMaterial({ map: createKathaBedsheetTexture(), roughness: 0.88 });
  addBox(1.6, 0.34, 2.3, -12.35, 0.36, -11.55, bedFrameMat, true);
  addBox(1.52, 0.16, 2.22, -12.35, 0.6, -11.55, kathaMat, false);
  addBox(1.64, 0.82, 0.1, -12.35, 0.75, -12.68, bedFrameMat, false);
  addBox(0.72, 0.16, 0.42, -12.35, 0.75, -12.32, new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 }), false);
  addBox(1.3, 0.22, 0.24, -12.35, 0.76, -10.55, new THREE.MeshStandardMaterial({ color: 0xbfdbfe, roughness: 0.9 }), false);

  interactables.push({
    id: 'mess_bed',
    type: 'bed',
    labelBn: 'বিছানায় বসুন / বিশ্রাম নিন',
    labelEn: 'Sit / Rest on Bed',
    icon: '🛏️',
    position: new THREE.Vector3(-11.3, 0.6, -11.4),
    radius: 2.2,
    sitPosition: new THREE.Vector3(-11.45, 0.14, -11.4),
    sitFacing: Math.PI / 2,
    insideMess: true
  });

  // Study Table & Chair
  const tableWood = new THREE.MeshStandardMaterial({ color: 0x7c4a26, roughness: 0.76 });
  addBox(2.0, 0.08, 0.95, -7.65, 0.88, -12.15, tableWood, true);
  for (const [lx, lz] of [
    [-8.55, -12.52],
    [-6.75, -12.52],
    [-8.55, -11.78],
    [-6.75, -11.78]
  ]) {
    addBox(0.08, 0.78, 0.08, lx, 0.48, lz, tableWood, false);
  }
  addBox(0.32, 0.06, 0.24, -8.35, 0.95, -12.32, new THREE.MeshStandardMaterial({ color: 0x1d4ed8 }), false, false);
  addBox(0.28, 0.05, 0.22, -8.34, 1.0, -12.31, new THREE.MeshStandardMaterial({ color: 0xdc2626 }), false, false);

  const chairX = -7.65;
  const chairZ = -11.15;
  addBox(0.54, 0.07, 0.52, chairX, 0.56, chairZ, woodDark, false);
  addBox(0.54, 0.56, 0.07, chairX, 0.84, chairZ + 0.24, woodDark, false);
  for (const [cx, cz] of [
    [chairX - 0.22, chairZ - 0.2],
    [chairX + 0.22, chairZ - 0.2],
    [chairX - 0.22, chairZ + 0.2],
    [chairX + 0.22, chairZ + 0.2]
  ]) {
    addBox(0.06, 0.44, 0.06, cx, 0.33, cz, woodDark, false, false);
  }
  interactables.push({
    id: 'mess_chair',
    type: 'mess_chair',
    labelBn: 'টেবিলের চেয়ারে বসুন',
    labelEn: 'Sit on Study Chair',
    icon: '🪑',
    position: new THREE.Vector3(chairX, 0.6, chairZ),
    radius: 1.9,
    sitPosition: new THREE.Vector3(chairX, 0.14, chairZ),
    sitFacing: Math.PI,
    insideMess: true
  });

  // Candle
  const candleGroup = new THREE.Group();
  candleGroup.position.set(-8.22, 0.92, -11.88);
  candleGroup.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.08, 0.02, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
    )
  );
  const candleWax = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.036, 0.2, 10),
    new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.6 })
  );
  candleWax.position.y = 0.11;
  candleGroup.add(candleWax);

  const candleFlame = new THREE.Group();
  candleFlame.position.y = 0.24;
  candleFlame.add(
    new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.085, 8), new THREE.MeshBasicMaterial({ color: 0xff8c00 }))
  );
  const flameInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.014, 0.05, 8),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  flameInner.position.y = -0.01;
  candleFlame.add(flameInner);
  candleFlame.visible = false;
  candleGroup.add(candleFlame);

  const candleLight = new THREE.PointLight(0xff9b3d, 0, 10, 1.5);
  candleLight.position.set(-8.22, 1.32, -11.88);
  scene.add(candleLight, candleGroup);

  interactables.push({
    id: 'candle',
    type: 'candle',
    labelBn: 'মোমবাতি জ্বালান / নিভান',
    labelEn: 'Candle',
    icon: '🕯️',
    position: new THREE.Vector3(-8.22, 1.0, -11.88),
    radius: 2.3,
    insideMess: true
  });

  // Emergency Fan
  const eFanGroup = new THREE.Group();
  eFanGroup.position.set(-7.65, 0.92, -12.22);
  const eFanBodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
  const eFanBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.18), eFanBodyMat);
  eFanBase.position.y = 0.04;
  const eFanStand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.07), eFanBodyMat);
  eFanStand.position.y = 0.18;
  const eFanRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.018, 8, 18),
    new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.45 })
  );
  eFanRing.position.set(0, 0.34, 0.05);
  eFanGroup.add(eFanBase, eFanStand, eFanRing);

  const emergencyFanRotor = new THREE.Group();
  emergencyFanRotor.position.set(0, 0.34, 0.06);
  const eBladeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 });
  for (let i = 0; i < 3; i++) {
    const bp = new THREE.Group();
    bp.rotation.z = (i * Math.PI * 2) / 3;
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.012), eBladeMat);
    bl.position.y = 0.07;
    bp.add(bl);
    emergencyFanRotor.add(bp);
  }
  eFanGroup.add(emergencyFanRotor);

  const emergencyFanLed = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x10b981,
    emissiveIntensity: 0
  });
  const eLed = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), emergencyFanLed);
  eLed.position.set(0.07, 0.085, 0.085);
  eFanGroup.add(eLed);
  scene.add(eFanGroup);

  interactables.push({
    id: 'emergency_fan',
    type: 'emergency_fan',
    labelBn: 'চার্জার ফ্যান চালু/বন্ধ',
    labelEn: 'Emergency Fan',
    icon: '🌀',
    position: new THREE.Vector3(-7.65, 1.0, -12.1),
    radius: 2.3,
    insideMess: true
  });

  // Mosquito Coil
  const coilGroup = new THREE.Group();
  coilGroup.position.set(-6.9, 0.93, -11.95);
  coilGroup.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.1, 0.016, 12),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6 })
    )
  );
  const coilRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.012, 6, 16),
    new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.9 })
  );
  coilRing.rotation.x = Math.PI / 2;
  coilRing.position.y = 0.03;
  coilGroup.add(coilRing);

  const coilEmberMat = new THREE.MeshStandardMaterial({
    color: 0x450a0a,
    emissive: 0xff4500,
    emissiveIntensity: 0
  });
  const ember = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), coilEmberMat);
  ember.position.set(0.06, 0.035, 0);
  coilGroup.add(ember);

  const coilSmokeGroup = new THREE.Group();
  coilSmokeGroup.position.set(0.06, 0.08, 0);
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.35 });
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.025 + i * 0.008, 6, 6), smokeMat);
    puff.position.y = i * 0.09;
    coilSmokeGroup.add(puff);
  }
  coilSmokeGroup.visible = false;
  coilGroup.add(coilSmokeGroup);
  scene.add(coilGroup);

  interactables.push({
    id: 'mosquito_coil',
    type: 'mosquito_coil',
    labelBn: 'মশার কয়েল জ্বালান',
    labelEn: 'Mosquito Coil',
    icon: '🦟',
    position: new THREE.Vector3(-6.9, 1.0, -11.95),
    radius: 2.3,
    insideMess: true
  });

  // Power Bank + Phone
  const pbGroup = new THREE.Group();
  pbGroup.position.set(-7.22, 0.93, -11.82);
  pbGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.22), new THREE.MeshStandardMaterial({ color: 0x1e293b })));
  const powerBankLedMat = new THREE.MeshStandardMaterial({ color: 0x334155, emissive: 0x38bdf8, emissiveIntensity: 0 });
  const pbLed = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.015), powerBankLedMat);
  pbLed.position.set(0, 0.018, 0.08);
  pbGroup.add(pbLed);
  const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.015, 0.2), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  phoneBody.position.set(0.16, 0.0, 0.02);
  const phoneScreenMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x22c55e, emissiveIntensity: 0 });
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.17), phoneScreenMat);
  phoneScreen.rotation.x = -Math.PI / 2;
  phoneScreen.position.set(0.16, 0.01, 0.02);
  pbGroup.add(phoneBody, phoneScreen);
  scene.add(pbGroup);

  interactables.push({
    id: 'power_bank',
    type: 'power_bank',
    labelBn: 'পাওয়ার ব্যাংকে ফোন চার্জ দিন',
    labelEn: 'Power Bank',
    icon: '🔋',
    position: new THREE.Vector3(-7.15, 1.0, -11.82),
    radius: 2.3,
    insideMess: true
  });

  // Mosquito Swarm inside Mess Room
  const mosquitoGroup = new THREE.Group();
  const mMat = new THREE.MeshBasicMaterial({ color: 0x1f2937 });
  const mWingMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.65 });
  for (let i = 0; i < 16; i++) {
    const bug = new THREE.Group();
    bug.add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), mMat));
    bug.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.018), mWingMat));
    bug.position.set(
      -10 + (Math.random() - 0.5) * 4.5,
      1.1 + Math.random() * 1.4,
      -10 + (Math.random() - 0.5) * 4.0
    );
    bug.userData = {
      baseX: bug.position.x,
      baseY: bug.position.y,
      baseZ: bug.position.z,
      phase: Math.random() * Math.PI * 2,
      speed: 2.5 + Math.random() * 2.5
    };
    mosquitoGroup.add(bug);
  }
  mosquitoGroup.visible = false;
  scene.add(mosquitoGroup);

  // =========================================================================
  // 2. SHARED REUSABLE BUILDER FOR BANGLADESHI TONG DOKANS (3 TEA STALLS!)
  // =========================================================================
  const cupGlassMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.72, roughness: 0.2 });
  const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.42 });
  const chairSeatGeo = new THREE.BoxGeometry(0.5, 0.06, 0.48);
  const chairBackGeo = new THREE.BoxGeometry(0.5, 0.48, 0.06);
  const chairLegGeo = new THREE.BoxGeometry(0.055, 0.46, 0.055);
  const plasticRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42 });
  const plasticBlueMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.42 });
  const plasticGreenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.42 });

  const makePlasticChair = (x: number, z: number, mat: THREE.Material, rotY: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.06, z);
    g.rotation.y = rotY;
    const seat = new THREE.Mesh(chairSeatGeo, mat);
    seat.position.y = 0.46;
    seat.castShadow = true;
    const back = new THREE.Mesh(chairBackGeo, mat);
    back.position.set(0, 0.72, 0.21);
    back.castShadow = true;
    g.add(seat, back);
    for (const [lx, lz] of [
      [-0.2, -0.19],
      [0.2, -0.19],
      [-0.2, 0.19],
      [0.2, 0.19]
    ]) {
      const leg = new THREE.Mesh(chairLegGeo, mat);
      leg.position.set(lx, 0.23, lz);
      g.add(leg);
    }
    scene.add(g);
  };

  const buildTongDokan = (cfg: {
    id: string;
    nameBn: string;
    signTitle: string;
    signSub: string;
    signBg: string;
    x: number;
    z: number;
    faceNorth?: boolean;
    ownerNpcId: string;
    ownerNameBn: string;
    roofMat: THREE.Material;
    chairMat1: THREE.Material;
    chairMat2: THREE.Material;
    includePointLight: boolean;
  }) => {
    const dir = cfg.faceNorth ? -1 : 1; // +1 = front faces South (+Z), -1 = front faces North (-Z)
    const tx = cfg.x;
    const tz = cfg.z;

    // Back wall, sides, front counter
    addBox(4.6, 2.55, 0.16, tx, 1.28, tz - dir * 1.35, tongBlueMat, true);
    addBox(0.16, 2.55, 2.7, tx - 2.25, 1.28, tz, tongBlueMat, true);
    addBox(0.16, 2.55, 2.7, tx + 2.25, 1.28, tz, tongBlueMat, true);
    addBox(4.4, 1.02, 0.72, tx, 0.51, tz + dir * 1.12, tongWoodMat, true);
    addBox(4.52, 0.08, 0.86, tx, 1.06, tz + dir * 1.12, new THREE.MeshStandardMaterial({ color: 0x8d5b34, roughness: 0.7 }), false);

    // Slanted tin awning
    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.1, 4.1), cfg.roofMat);
    roof.position.set(tx, 2.76, tz + dir * 0.32);
    roof.rotation.x = dir * 0.14;
    roof.castShadow = true;
    roof.receiveShadow = true;
    scene.add(roof);

    addBox(0.11, 2.48, 0.11, tx - 2.25, 1.24, tz + dir * 1.95, bambooMat, false);
    addBox(0.11, 2.48, 0.11, tx + 2.25, 1.24, tz + dir * 1.95, bambooMat, false);

    // Hand-painted Bengali signboard
    const signTex = createBengaliSignTexture({
      bg: cfg.signBg,
      border: '#facc15',
      title: cfg.signTitle,
      subtitle: cfg.signSub,
      titleColor: '#fef08a',
      subtitleColor: '#ffffff',
      accentBar: 'rgba(0,0,0,0.28)'
    });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.92, 0.1), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.5 }));
    sign.position.set(tx, 2.95, tz + dir * 2.25);
    if (cfg.faceNorth) sign.rotation.y = Math.PI;
    scene.add(sign);

    // Kettle, burner, steam, cups, biscuit jars
    addBox(0.45, 0.12, 0.45, tx - 1.3, 1.16, tz + dir * 1.08, new THREE.MeshStandardMaterial({ color: 0x334155 }), false, false);
    const flame = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.03, 10), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    flame.position.set(tx - 1.3, 1.23, tz + dir * 1.08);
    scene.add(flame);

    const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.24, 12), metalMat);
    kettle.position.set(tx - 1.3, 1.36, tz + dir * 1.08);
    scene.add(kettle);

    const steam = new THREE.Group();
    steam.position.set(tx - 1.26, 1.52, tz + dir * 1.08);
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.04 + i * 0.012, 5, 5), steamMat);
      p.position.y = i * 0.12;
      steam.add(p);
    }
    scene.add(steam);
    kettleSteamGroups.push(steam);

    for (let i = 0; i < 4; i++) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.08, 8), cupGlassMat);
      cup.position.set(tx - 0.5 + i * 0.16, 1.14, tz + dir * 1.16);
      scene.add(cup);
    }
    const jarColors = [0xd97706, 0xb45309, 0xca8a04];
    for (let i = 0; i < 3; i++) {
      const jx = tx + 0.7 + i * 0.42;
      const jar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.3, 10),
        new THREE.MeshStandardMaterial({ color: jarColors[i], transparent: true, opacity: 0.85, roughness: 0.3 })
      );
      jar.position.set(jx, 1.25, tz + dir * 1.12);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.05, 10), plasticRedMat);
      lid.position.set(jx, 1.42, tz + dir * 1.12);
      scene.add(jar, lid);
    }

    // Hanging bananas
    const bGrp = new THREE.Group();
    bGrp.position.set(tx + 1.88, 2.08, tz + dir * 1.42);
    const bMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 4, 6), bMat);
      b.position.set(Math.cos(i * 1.0) * 0.08, -i * 0.03, Math.sin(i * 1.0) * 0.08);
      b.rotation.z = 0.45;
      bGrp.add(b);
    }
    scene.add(bGrp);

    // Tungsten bulb + optional PointLight + backup kupi light during blackout
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xffd54f, emissiveIntensity: 0 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), bulbMat);
    bulb.position.set(tx, 2.35, tz + dir * 0.7);
    scene.add(bulb);
    tongBulbMats.push(bulbMat);

    if (cfg.includePointLight) {
      const tLight = new THREE.PointLight(0xffd27d, 0, 12, 1.5);
      tLight.position.set(tx, 2.2, tz + dir * 0.9);
      scene.add(tLight);
      tongLights.push(tLight);

      const kLight = new THREE.PointLight(0xff8a2b, 0, 7.5, 1.7);
      kLight.position.set(tx + 0.15, 1.45, tz + dir * 1.15);
      scene.add(kLight);
      tongKupiLights.push(kLight);
    }

    // Plastic chairs & bench in front
    const chairZ = tz + dir * 2.55;
    const chairRot = cfg.faceNorth ? Math.PI : 0;
    const sitFacing = cfg.faceNorth ? 0 : Math.PI;
    makePlasticChair(tx - 1.25, chairZ, cfg.chairMat1, chairRot + 0.14);
    makePlasticChair(tx + 0.05, chairZ + dir * 0.08, cfg.chairMat2, chairRot - 0.1);

    const benchX = tx + 1.75;
    addBox(1.55, 0.08, 0.44, benchX, 0.5, chairZ, tongWoodMat, false);
    addBox(0.1, 0.44, 0.38, benchX - 0.62, 0.25, chairZ, tongWoodMat, false);
    addBox(0.1, 0.44, 0.38, benchX + 0.62, 0.25, chairZ, tongWoodMat, false);

    interactables.push({
      id: `${cfg.id}_chair_1`,
      type: 'tong_chair',
      labelBn: `${cfg.nameBn}-এর চেয়ারে বসুন`,
      labelEn: `Sit at ${cfg.nameBn}`,
      icon: '🪑',
      position: new THREE.Vector3(tx - 1.25, 0.5, chairZ),
      radius: 2.0,
      sitPosition: new THREE.Vector3(tx - 1.25, 0.06, chairZ),
      sitFacing: sitFacing + 0.14
    });
    interactables.push({
      id: `${cfg.id}_chair_2`,
      type: 'tong_chair',
      labelBn: 'চেয়ারে বসুন',
      labelEn: 'Sit on Chair',
      icon: '🪑',
      position: new THREE.Vector3(tx + 0.05, 0.5, chairZ + dir * 0.08),
      radius: 2.0,
      sitPosition: new THREE.Vector3(tx + 0.05, 0.06, chairZ + dir * 0.08),
      sitFacing: sitFacing - 0.1
    });
    interactables.push({
      id: `${cfg.id}_counter`,
      type: 'tong_counter',
      labelBn: `${cfg.ownerNameBn} — চা ও বিস্কুট অর্ডার করুন`,
      labelEn: 'Order Tea & Biscuits',
      icon: '🍵',
      position: new THREE.Vector3(tx - 0.4, 1.1, tz + dir * 1.75),
      radius: 3.1,
      npcId: cfg.ownerNpcId
    });

    buildings.push({
      id: cfg.id,
      nameBn: cfg.nameBn,
      nameEn: 'Tong Dokan',
      x: tx,
      z: tz,
      width: 4.8,
      depth: 3.2,
      color: '#f59e0b',
      kind: 'tong'
    });

    const minZ = cfg.faceNorth ? tz - 4.2 : tz - 1.6;
    const maxZ = cfg.faceNorth ? tz + 1.6 : tz + 4.4;
    namedZones.push({
      id: cfg.id,
      label: `🍵 ${cfg.nameBn} • Tong Dokan`,
      minX: tx - 3.8,
      maxX: tx + 3.8,
      minZ,
      maxZ,
      isTong: true,
      tongOwnerId: cfg.ownerNpcId
    });
  };

  // Tong #1: Original Mama's Tong Dokan
  buildTongDokan({
    id: 'tong_mama',
    nameBn: "মামা'র টং",
    signTitle: "মামা'র টং দোকান",
    signSub: 'গরম দুধ চা ১০৳ • লাল চা ৫৳ • বিস্কুট',
    signBg: '#b91c1c',
    x: 10.0,
    z: -4.0,
    ownerNpcId: 'rafiq_mama',
    ownerNameBn: 'রফিক মামা',
    roofMat: tinMatBlue,
    chairMat1: plasticRedMat,
    chairMat2: plasticBlueMat,
    includePointLight: true
  });

  // Tong #2: East Bazar Haji Chacha's Tea Stall
  buildTongDokan({
    id: 'tong_haji',
    nameBn: 'হাজী চাচার টং',
    signTitle: 'হাজী চাচার চায়ের টং',
    signSub: 'স্পেশাল আদা চা • মালাই চা • টোস্ট',
    signBg: '#065f46',
    x: 34.0,
    z: -4.2,
    ownerNpcId: 'haji_chacha',
    ownerNameBn: 'হাজী চাচা',
    roofMat: tinMatGreen,
    chairMat1: plasticGreenMat,
    chairMat2: plasticRedMat,
    includePointLight: true
  });

  // Tong #3: Bottola South-East Pan & Tea Stall (facing North toward Main Road)
  buildTongDokan({
    id: 'tong_bottola',
    nameBn: 'বটতলা টং',
    signTitle: 'বটতলা চা ও পান ঘর',
    signSub: 'দুধ চা • লাল চা • আড্ডা',
    signBg: '#9a3412',
    x: 18.8,
    z: 10.2,
    faceNorth: true,
    ownerNpcId: 'jasim_bhai',
    ownerNameBn: 'জসিম ভাই',
    roofMat: tinMatBlue,
    chairMat1: plasticBlueMat,
    chairMat2: plasticGreenMat,
    includePointLight: false
  });

  // Tong #4: West Suburb Kashem's Wooden Tong Dokan
  buildTongDokan({
    id: 'tong_kashem',
    nameBn: 'কাশেমের টং',
    signTitle: 'কাশেমের কাঠের টং',
    signSub: 'লেবু চা • মাল্টা চা • গরম শিঙাড়া',
    signBg: '#7c2d12',
    x: -42.0,
    z: -4.0,
    ownerNpcId: 'kashem_bhai',
    ownerNameBn: 'কাশেম ভাই',
    roofMat: tinMatGreen,
    chairMat1: plasticRedMat,
    chairMat2: plasticBlueMat,
    includePointLight: true
  });

  // =========================================================================
  // 3. EXPANDED BANGLADESHI RESIDENTIAL HOUSES, MESS BUILDINGS & SHOPS
  // =========================================================================
  const buildBuilding = (cfg: {
    id: string;
    nameBn: string;
    kind: 'mess' | 'shop' | 'house';
    x: number;
    z: number;
    w: number;
    h: number;
    d: number;
    wallHex: string;
    faceDir: 'south' | 'north' | 'east' | 'west';
    waterTank?: boolean;
    sign?: { title: string; subtitle: string; bg: string };
  }) => {
    const mat = new THREE.MeshStandardMaterial({
      map: createPlasterWallTexture(cfg.wallHex),
      roughness: 0.92
    });
    addBox(cfg.w, cfg.h, cfg.d, cfg.x, cfg.h / 2, cfg.z, mat, true);
    // Roof parapet trim
    addBox(cfg.w + 0.24, 0.34, cfg.d + 0.24, cfg.x, cfg.h + 0.17, cfg.z, curbMat, false);

    if (cfg.waterTank) {
      addWaterTank(cfg.x - cfg.w * 0.25, cfg.h + 0.85, cfg.z - cfg.d * 0.2);
    }

    // Add glowing windows on front face & side accents
    const floors = cfg.h > 7.2 ? 3 : cfg.h > 4.6 ? 2 : 1;
    const isZFace = cfg.faceDir === 'south' || cfg.faceDir === 'north';
    const faceSign = cfg.faceDir === 'south' || cfg.faceDir === 'east' ? 1 : -1;

    for (let fl = 0; fl < floors; fl++) {
      const wy = 2.0 + fl * 2.4;
      if (wy > cfg.h - 0.8) continue;
      const span = isZFace ? cfg.w : cfg.d;
      const offsets = span > 7.4 ? [-span * 0.3, 0, span * 0.3] : [-span * 0.24, span * 0.24];
      for (const off of offsets) {
        if (isZFace) {
          addBox(1.15, 1.1, 0.08, cfg.x + off, wy, cfg.z + faceSign * (cfg.d / 2 + 0.04), houseWindowMat, false, false);
        } else {
          addBox(0.08, 1.1, 1.15, cfg.x + faceSign * (cfg.w / 2 + 0.04), wy, cfg.z + off, houseWindowMat, false, false);
        }
      }
    }

    // Shop shutter or Bengali signboard
    if (cfg.sign) {
      const sTex = createBengaliSignTexture({
        bg: cfg.sign.bg,
        border: '#f8fafc',
        title: cfg.sign.title,
        subtitle: cfg.sign.subtitle,
        titleColor: '#fef08a'
      });
      const signW = Math.min((isZFace ? cfg.w : cfg.d) - 0.8, 4.0);
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(signW, 0.96, 0.1),
        new THREE.MeshStandardMaterial({ map: sTex, roughness: 0.55 })
      );
      const sy = cfg.kind === 'shop' ? 3.25 : 3.6;
      if (isZFace) {
        sign.position.set(cfg.x, sy, cfg.z + faceSign * (cfg.d / 2 + 0.09));
        if (cfg.faceDir === 'north') sign.rotation.y = Math.PI;
      } else {
        sign.position.set(cfg.x + faceSign * (cfg.w / 2 + 0.09), sy, cfg.z);
        sign.rotation.y = cfg.faceDir === 'east' ? Math.PI / 2 : -Math.PI / 2;
      }
      scene.add(sign);
    }

    if (cfg.kind === 'shop') {
      const counterSpan = 1.15;
      const counterX = isZFace ? cfg.x : cfg.x + faceSign * (cfg.w / 2 + counterSpan);
      const counterZ = isZFace ? cfg.z + faceSign * (cfg.d / 2 + counterSpan) : cfg.z;

      // Slanted tin awning over shop entrance
      const awningW = isZFace ? Math.min(cfg.w - 0.4, 4.4) : 1.35;
      const awningD = isZFace ? 1.35 : Math.min(cfg.d - 0.4, 4.4);
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(awningW, 0.08, awningD),
        tinMatGreen
      );
      awning.position.set(
        isZFace ? cfg.x : cfg.x + faceSign * (cfg.w / 2 + 0.65),
        2.68,
        isZFace ? cfg.z + faceSign * (cfg.d / 2 + 0.65) : cfg.z
      );
      if (isZFace) {
        awning.rotation.x = faceSign * 0.12;
      } else {
        awning.rotation.z = -faceSign * 0.12;
      }
      awning.castShadow = true;
      scene.add(awning);

      // Wooden front service counter
      const cW = isZFace ? Math.min(cfg.w - 1.2, 3.2) : 0.65;
      const cD = isZFace ? 0.65 : Math.min(cfg.d - 1.2, 3.2);
      const counter = new THREE.Mesh(
        new THREE.BoxGeometry(cW, 0.95, cD),
        tongWoodMat
      );
      counter.position.set(
        isZFace ? cfg.x : cfg.x + faceSign * (cfg.w / 2 + 0.35),
        0.48,
        isZFace ? cfg.z + faceSign * (cfg.d / 2 + 0.35) : cfg.z
      );
      counter.castShadow = true;
      scene.add(counter);

      interactables.push({
        id: `${cfg.id}_counter`,
        type: 'shop_counter',
        labelBn: `${cfg.nameBn} — দোকানে কথা বলুন ও জিনিসপত্র কিনুন`,
        labelEn: `Shop at ${cfg.nameBn}`,
        icon: '🛍️',
        position: new THREE.Vector3(counterX, 1.0, counterZ),
        radius: 2.8,
        shopId: cfg.id
      });
    }

    buildings.push({
      id: cfg.id,
      nameBn: cfg.nameBn,
      nameEn: cfg.nameBn,
      x: cfg.x,
      z: cfg.z,
      width: cfg.w,
      depth: cfg.d,
      color: cfg.kind === 'mess' ? '#10b981' : cfg.kind === 'shop' ? '#ec4899' : '#64748b',
      kind: cfg.kind
    });
  };

  // Additional Mess Buildings
  buildBuilding({
    id: 'mess_annex',
    nameBn: 'সবুজ মেস-২',
    kind: 'mess',
    x: -19.2,
    z: -10.5,
    w: 6.0,
    h: 6.2,
    d: 6.6,
    wallHex: '#d8e7dc',
    faceDir: 'south',
    waterTank: true
  });
  buildBuilding({
    id: 'mess_probhati',
    nameBn: 'প্রভাতী মেস',
    kind: 'mess',
    x: -36.5,
    z: -9.5,
    w: 9.0,
    h: 7.8,
    d: 7.2,
    wallHex: '#e6e8c8',
    faceDir: 'east',
    waterTank: true,
    sign: { title: 'প্রভাতী ছাত্রাবাস', subtitle: 'ছাত্র মেস • সিট খালি আছে', bg: '#047857' }
  });
  buildBuilding({
    id: 'mess_arunodoy',
    nameBn: 'অরুণোদয় মেস',
    kind: 'mess',
    x: -12.5,
    z: -31.5,
    w: 9.4,
    h: 7.5,
    d: 6.8,
    wallHex: '#d4e2ea',
    faceDir: 'south',
    waterTank: true,
    sign: { title: 'অরুণোদয় ছাত্রাবাস', subtitle: 'মেস ভবন • উত্তর পাড়া', bg: '#0f766e' }
  });

  // Local Shops
  buildBuilding({
    id: 'shop_bkash',
    nameBn: 'জনতা স্টোর',
    kind: 'shop',
    x: 18.2,
    z: -6.0,
    w: 6.2,
    h: 4.5,
    d: 5.0,
    wallHex: '#e6ccb2',
    faceDir: 'south',
    sign: { title: 'জনতা ভ্যারাইটিজ স্টোর', subtitle: 'বিকাশ • নগদ • ফ্লেক্সিলোড', bg: '#be185d' }
  });
  buildBuilding({
    id: 'shop_pharmacy',
    nameBn: 'বিসমিল্লাহ ফার্মেসি',
    kind: 'shop',
    x: -18.0,
    z: 10.5,
    w: 7.0,
    h: 5.8,
    d: 5.6,
    wallHex: '#f1d4d4',
    faceDir: 'north',
    sign: { title: 'বিসমিল্লাহ ফার্মেসি', subtitle: 'সকল প্রকার ঔষধ পাওয়া যায়', bg: '#0369a1' }
  });
  buildBuilding({
    id: 'shop_grocery',
    nameBn: 'আল-আমিন স্টোর',
    kind: 'shop',
    x: -36.5,
    z: 11.5,
    w: 8.0,
    h: 5.0,
    d: 6.2,
    wallHex: '#eadac0',
    faceDir: 'east',
    sign: { title: 'আল-আমিন মুদি দোকান', subtitle: 'চাল • ডাল • তেল • নিত্যপণ্য', bg: '#15803d' }
  });
  buildBuilding({
    id: 'shop_salon',
    nameBn: 'ঢাকা সেলুন',
    kind: 'shop',
    x: 36.8,
    z: -13.2,
    w: 8.2,
    h: 4.8,
    d: 5.4,
    wallHex: '#dbeafe',
    faceDir: 'west',
    sign: { title: 'ঢাকা সেলুন ও লন্ড্রি', subtitle: 'জেন্টস পার্লার • আয়রন ও ওয়াশ', bg: '#1d4ed8' }
  });
  buildBuilding({
    id: 'shop_sweets',
    nameBn: 'মধুবন মিষ্টান্ন',
    kind: 'shop',
    x: 36.5,
    z: 11.8,
    w: 8.4,
    h: 5.2,
    d: 6.0,
    wallHex: '#fde6c4',
    faceDir: 'west',
    sign: { title: 'মধুবন মিষ্টান্ন ভাণ্ডার', subtitle: 'রসগোল্লা • দই • গরম জিলাপি', bg: '#c2410c' }
  });
  buildBuilding({
    id: 'club_library',
    nameBn: 'তরুণ পাঠাগার',
    kind: 'shop',
    x: 12.5,
    z: -31.0,
    w: 9.2,
    h: 5.4,
    d: 6.6,
    wallHex: '#e0efe5',
    faceDir: 'south',
    sign: { title: 'তরুণ সংঘ পাঠাগার ও ক্লাব', subtitle: 'বই পড়ুন • পাড়ার সাংস্কৃতিক কেন্দ্র', bg: '#065f46' }
  });

  // Residential Bangladeshi Houses
  buildBuilding({
    id: 'house_shapla',
    nameBn: 'শাপলা ভবন',
    kind: 'house',
    x: 12.0,
    z: -13.5,
    w: 8.2,
    h: 6.2,
    d: 5.4,
    wallHex: '#f0d8c8',
    faceDir: 'north',
    waterTank: true
  });
  buildBuilding({
    id: 'house_padma',
    nameBn: 'পদ্মা ভিলা',
    kind: 'house',
    x: 9.0,
    z: 11.2,
    w: 8.0,
    h: 6.0,
    d: 5.8,
    wallHex: '#e2d9b8',
    faceDir: 'north',
    waterTank: true
  });
  buildBuilding({
    id: 'house_bokul',
    nameBn: 'বকুল কুটির',
    kind: 'house',
    x: -36.5,
    z: -30.5,
    w: 8.6,
    h: 6.0,
    d: 6.4,
    wallHex: '#ecc8c0',
    faceDir: 'south',
    waterTank: true
  });
  buildBuilding({
    id: 'house_kodom',
    nameBn: 'কদম ভিলা',
    kind: 'house',
    x: -36.5,
    z: 30.8,
    w: 8.6,
    h: 6.2,
    d: 5.6,
    wallHex: '#e8d8b5',
    faceDir: 'north',
    waterTank: true
  });
  buildBuilding({
    id: 'house_jamuna',
    nameBn: 'যমুনা ভিলা',
    kind: 'house',
    x: -12.5,
    z: 30.8,
    w: 9.0,
    h: 7.4,
    d: 5.6,
    wallHex: '#d9e3d8',
    faceDir: 'north',
    waterTank: true
  });
  buildBuilding({
    id: 'house_lalbag',
    nameBn: 'লালবাগ হাউস',
    kind: 'house',
    x: 12.5,
    z: 30.8,
    w: 9.2,
    h: 6.4,
    d: 5.6,
    wallHex: '#ebd1c3',
    faceDir: 'north',
    waterTank: true
  });
  buildBuilding({
    id: 'house_surma',
    nameBn: 'সুরমা নীড়',
    kind: 'house',
    x: 36.5,
    z: -30.5,
    w: 8.8,
    h: 6.5,
    d: 6.4,
    wallHex: '#dcd7e8',
    faceDir: 'south',
    waterTank: true
  });
  buildBuilding({
    id: 'house_meghna',
    nameBn: 'মেঘনা হাইটস',
    kind: 'house',
    x: 36.5,
    z: 30.8,
    w: 8.8,
    h: 7.8,
    d: 5.6,
    wallHex: '#e7dfd0',
    faceDir: 'north',
    waterTank: true
  });

  // --- EXPANDED NEW SHOPS ---
  buildBuilding({
    id: 'shop_boighar',
    nameBn: 'জ্ঞানালোক বইঘর',
    kind: 'shop',
    x: -46.8,
    z: 11.5,
    w: 7.2,
    h: 5.2,
    d: 5.6,
    wallHex: '#e2e8f0',
    faceDir: 'north',
    sign: { title: 'জ্ঞানালোক বই বিতান ও স্টেশনারি', subtitle: 'খাতা • কলম • বই • ফটোকপি', bg: '#0284c7' }
  });
  buildBuilding({
    id: 'shop_tailor',
    nameBn: 'জননী টেইলার্স',
    kind: 'shop',
    x: 46.8,
    z: -13.5,
    w: 7.2,
    h: 4.8,
    d: 5.4,
    wallHex: '#fef3c7',
    faceDir: 'west',
    sign: { title: 'জননী টেইলার্স অ্যান্ড ফেব্রিক্স', subtitle: 'পাঞ্জাবি ও শার্ট স্পেশালিস্ট', bg: '#d97706' }
  });
  buildBuilding({
    id: 'shop_restaurant',
    nameBn: 'আমানত হোটেল',
    kind: 'shop',
    x: 46.8,
    z: 10.5,
    w: 7.2,
    h: 5.5,
    d: 5.6,
    wallHex: '#fed7aa',
    faceDir: 'west',
    sign: { title: 'আমানত হোটেল ও বিরিয়ানি হাউজ', subtitle: 'সকালের নাস্তা • দুপুরের খাবার • বিরিয়ানি', bg: '#b91c1c' }
  });
  buildBuilding({
    id: 'shop_diagnostic',
    nameBn: 'মাতৃছায়া ফার্মেসি',
    kind: 'shop',
    x: -64.0,
    z: -10.0,
    w: 8.2,
    h: 6.0,
    d: 6.2,
    wallHex: '#dcfce7',
    faceDir: 'east',
    sign: { title: 'মাতৃছায়া ডায়াগনস্টিক ও ফার্মেসি', subtitle: '২৪ ঘণ্টা খোলা • জরুরী ঔষধ সেবা', bg: '#15803d' }
  });

  // --- EXPANDED NEW MESS BUILDINGS ---
  buildBuilding({
    id: 'mess_madhumati',
    nameBn: 'মধুমতী মেস',
    kind: 'mess',
    x: -64.0,
    z: -30.0,
    w: 9.2,
    h: 7.5,
    d: 7.0,
    wallHex: '#e0e7ff',
    faceDir: 'south',
    waterTank: true,
    sign: { title: 'মধুমতী ছাত্রাবাস (মেস)', subtitle: 'শান্তিপূর্ণ পরিবেশ • পশ্চিম পাড়া', bg: '#4338ca' }
  });
  buildBuilding({
    id: 'mess_padma_meghna',
    nameBn: 'পদ্মা-মেঘনা মেস',
    kind: 'mess',
    x: 64.0,
    z: -30.0,
    w: 9.2,
    h: 7.5,
    d: 7.0,
    wallHex: '#ccfbf1',
    faceDir: 'south',
    waterTank: true,
    sign: { title: 'পদ্মা-মেঘনা ছাত্রাবাস', subtitle: 'অনার্স ও মাস্টার্স মেস • পূর্ব পাড়া', bg: '#0d9488' }
  });

  // --- EXPANDED NEW RESIDENTIAL HOUSES (MULTI-ROOM & FAMILY HOMES) ---
  buildBuilding({
    id: 'house_karnafuli',
    nameBn: 'কর্ণফুলী মঞ্জিল',
    kind: 'house',
    x: -64.0,
    z: 11.5,
    w: 8.6,
    h: 6.4,
    d: 6.4,
    wallHex: '#fef08a',
    faceDir: 'east',
    waterTank: true
  });
  buildBuilding({
    id: 'house_dhanshiri',
    nameBn: 'ধানসিঁড়ি ভবন',
    kind: 'house',
    x: -64.0,
    z: 30.8,
    w: 8.8,
    h: 6.5,
    d: 5.6,
    wallHex: '#fbcfe8',
    faceDir: 'east',
    waterTank: true
  });
  buildBuilding({
    id: 'house_teesta',
    nameBn: 'তিস্তা ভিলা',
    kind: 'house',
    x: 64.0,
    z: 11.5,
    w: 8.6,
    h: 6.4,
    d: 6.4,
    wallHex: '#fed7aa',
    faceDir: 'west',
    waterTank: true
  });
  buildBuilding({
    id: 'house_ruposhi',
    nameBn: 'রূপসী বাংলা',
    kind: 'house',
    x: 64.0,
    z: 30.8,
    w: 8.8,
    h: 6.8,
    d: 5.6,
    wallHex: '#bae6fd',
    faceDir: 'west',
    waterTank: true
  });
  buildBuilding({
    id: 'house_nilgiri',
    nameBn: 'নীলগিরি কটেজ',
    kind: 'house',
    x: -12.5,
    z: -53.5,
    w: 9.0,
    h: 6.2,
    d: 6.2,
    wallHex: '#ddd6fe',
    faceDir: 'south',
    waterTank: true
  });
  buildBuilding({
    id: 'house_suryomukhi',
    nameBn: 'সূর্যমুখী ভিলা',
    kind: 'house',
    x: 12.5,
    z: -53.5,
    w: 9.0,
    h: 6.2,
    d: 6.2,
    wallHex: '#fef9c3',
    faceDir: 'south',
    waterTank: true
  });
  buildBuilding({
    id: 'house_park',
    nameBn: 'পার্ক ভিউ ভবন',
    kind: 'house',
    x: -12.5,
    z: 53.5,
    w: 9.0,
    h: 6.4,
    d: 6.2,
    wallHex: '#e2e8f0',
    faceDir: 'north',
    waterTank: true
  });
  buildBuilding({
    id: 'house_bonolata',
    nameBn: 'বনলতা কুটির',
    kind: 'house',
    x: 12.5,
    z: 53.5,
    w: 9.0,
    h: 6.2,
    d: 6.2,
    wallHex: '#dcfce7',
    faceDir: 'north',
    waterTank: true
  });

  // --- EXPANDED AUTHENTIC BANGLADESHI COMMERCIAL SHOPS ---
  buildBuilding({
    id: 'shop_fruit_stall',
    nameBn: 'সততা ফল ভাণ্ডার',
    kind: 'shop',
    x: -78.0,
    z: -6.0,
    w: 6.2,
    h: 4.8,
    d: 4.8,
    wallHex: '#fed7aa',
    faceDir: 'south',
    sign: { title: 'সততা ফল ভাণ্ডার', subtitle: 'তাজা আম • আপেল • ডাবের পানি', bg: '#c2410c' }
  });
  buildBuilding({
    id: 'shop_kitchen_market',
    nameBn: 'কাঁচাবাজার ও সবজি আড়ত',
    kind: 'shop',
    x: 18.2,
    z: 16.5,
    w: 6.8,
    h: 4.8,
    d: 5.2,
    wallHex: '#dcfce7',
    faceDir: 'north',
    sign: { title: 'কাঁচাবাজার ও সবজি আড়ত', subtitle: 'তাজা আলু • গোল লাউ • লাল টমেটো', bg: '#15803d' }
  });
  buildBuilding({
    id: 'shop_fish_market',
    nameBn: 'মেঘনা মাছের আড়ত',
    kind: 'shop',
    x: 93.0,
    z: -5.0,
    w: 7.5,
    h: 4.8,
    d: 5.0,
    wallHex: '#bae6fd',
    faceDir: 'west',
    sign: { title: 'মেঘনা তাজা মাছের আড়ত', subtitle: 'রূপালী ইলিশ • তাজা রুই • নদীর মাছ', bg: '#0369a1' }
  });
  buildBuilding({
    id: 'shop_fuchka',
    nameBn: 'বিসমিল্লাহ ফুচকা ও চটপটি',
    kind: 'shop',
    x: 93.0,
    z: 33.0,
    w: 6.5,
    h: 4.6,
    d: 4.8,
    wallHex: '#fef08a',
    faceDir: 'west',
    sign: { title: 'বিসমিল্লাহ ফুচকা ও চটপটি', subtitle: 'স্পেশাল টক-ঝাল ফুচকা • ডিম চটপটি', bg: '#b91c1c' }
  });
  buildBuilding({
    id: 'shop_hardware',
    nameBn: 'ভাই ভাই হার্ডওয়্যার',
    kind: 'shop',
    x: -36.5,
    z: 47.5,
    w: 7.5,
    h: 5.2,
    d: 5.5,
    wallHex: '#f1f5f9',
    faceDir: 'north',
    sign: { title: 'ভাই ভাই হার্ডওয়্যার ও ইলেকট্রিক', subtitle: 'এলইডি বাল্ব • সুইচ • সকেট • পেইন্ট ও টুলস', bg: '#1e3a8a' }
  });
  buildBuilding({
    id: 'shop_telecom',
    nameBn: 'ডিজিটাল বিকাশ-নগদ সেবা',
    kind: 'shop',
    x: -78.0,
    z: 11.5,
    w: 6.8,
    h: 4.8,
    d: 5.0,
    wallHex: '#fdf2f8',
    faceDir: 'north',
    sign: { title: 'ডিজিটাল বিকাশ ও নগদ পয়েন্ট', subtitle: 'ফ্লেক্সিলোড • ক্যাশ আউট • মোবাইল ব্যাংকিং', bg: '#db2777' }
  });

  // --- EXPANDED NEW MESS BUILDINGS & RESIDENCES ---
  buildBuilding({
    id: 'mess_dhanmondi',
    nameBn: 'ধানমন্ডি ছাত্রাবাস',
    kind: 'mess',
    x: -107.0,
    z: -33.0,
    w: 8.8,
    h: 7.2,
    d: 7.2,
    wallHex: '#e0e7ff',
    faceDir: 'east',
    waterTank: true,
    sign: { title: 'ধানমন্ডি ছাত্রাবাস', subtitle: 'শান্তিপূর্ণ পরিবেশ • পশ্চিম পাড়া', bg: '#3730a3' }
  });
  buildBuilding({
    id: 'mess_jamuna',
    nameBn: 'যমুনা ছাত্রাবাস',
    kind: 'mess',
    x: 120.0,
    z: -20.0,
    w: 9.2,
    h: 7.2,
    d: 7.2,
    wallHex: '#ccfbf1',
    faceDir: 'west',
    waterTank: true,
    sign: { title: 'যমুনা ছাত্রাবাস', subtitle: 'মেস ভবন • পূর্ব কৃষি পল্লী', bg: '#0f766e' }
  });
  buildBuilding({
    id: 'mess_shapla',
    nameBn: 'শাপলা মেস ভবন',
    kind: 'mess',
    x: -107.0,
    z: 16.0,
    w: 8.8,
    h: 7.2,
    d: 7.2,
    wallHex: '#fef9c3',
    faceDir: 'east',
    waterTank: true,
    sign: { title: 'শাপলা ছাত্রাবাস', subtitle: 'মেস ভবন • দক্ষিণ-পশ্চিম কলোনি', bg: '#166534' }
  });
  buildBuilding({
    id: 'house_rupnagar',
    nameBn: 'রূপনগর ভিলা',
    kind: 'house',
    x: -107.0,
    z: -57.0,
    w: 8.6,
    h: 6.4,
    d: 6.8,
    wallHex: '#fed7aa',
    faceDir: 'east',
    waterTank: true
  });
  buildBuilding({
    id: 'house_greenview',
    nameBn: 'গ্রিন ভিউ ভিলা',
    kind: 'house',
    x: -64.0,
    z: -54.0,
    w: 8.8,
    h: 6.4,
    d: 6.0,
    wallHex: '#dcfce7',
    faceDir: 'south',
    waterTank: true
  });
  buildBuilding({
    id: 'house_agrohamlet',
    nameBn: 'এগ্রো পল্লী খামার বাড়ি',
    kind: 'house',
    x: 120.0,
    z: -50.0,
    w: 8.8,
    h: 6.2,
    d: 6.6,
    wallHex: '#fef3c7',
    faceDir: 'west',
    waterTank: true
  });
  buildBuilding({
    id: 'house_sonargaon',
    nameBn: 'সোনারগাঁও ভিলা',
    kind: 'house',
    x: 120.0,
    z: 16.0,
    w: 8.8,
    h: 6.4,
    d: 6.4,
    wallHex: '#fbcfe8',
    faceDir: 'west',
    waterTank: true
  });

  // Low decorative brick boundary walls framing yards (never blocking streets)
  addBox(4.0, 1.25, 0.28, -4.0, 0.625, -6.5, boundaryBrickMat, true);
  addBox(6.0, 1.25, 0.28, -18.5, 0.625, 19.2, boundaryBrickMat, true);
  addBox(5.5, 1.25, 0.28, 36.5, 0.625, 19.2, boundaryBrickMat, true);

  // =========================================================================
  // 3B. MEGHNA CANAL / RIVER & 4 FULLY ELEVATED COLLISION-PROOF BRIDGES
  // =========================================================================

  // --- CANAL / RIVER (মেঘনা খাল ও নদী) ---
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.1,
    metalness: 0.38,
    transparent: true,
    opacity: 0.82
  });
  const waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 230), waterMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(66.0, -0.18, 0);
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);

  // Stone Embankment Canal Walls on both banks
  const bankMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88 });
  const westBankWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 230), bankMat);
  westBankWall.position.set(58.0, -0.05, 0);
  const eastBankWall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 230), bankMat);
  eastBankWall.position.set(74.0, -0.05, 0);
  scene.add(westBankWall, eastBankWall);

  // Deep Water Protection Boundaries (Prevents falling off embankments into canal)
  // West Bank (x = 57.2..58.2)
  colliders.push({ minX: 57.2, maxX: 58.2, minZ: -110, maxZ: -72.6, label: 'West Canal Embankment Far North' });
  colliders.push({ minX: 57.2, maxX: 58.2, minZ: -63.4, maxZ: -38.0, label: 'West Canal Embankment North' });
  colliders.push({ minX: 57.2, maxX: 58.2, minZ: -34.0, maxZ: -2.6, label: 'West Canal Embankment Central North' });
  colliders.push({ minX: 57.2, maxX: 58.2, minZ: 6.6, maxZ: 35.0, label: 'West Canal Embankment Central South' });
  colliders.push({ minX: 57.2, maxX: 58.2, minZ: 43.4, maxZ: 110, label: 'West Canal Embankment Far South' });

  // East Bank (x = 73.8..74.8)
  colliders.push({ minX: 73.8, maxX: 74.8, minZ: -110, maxZ: -72.6, label: 'East Canal Embankment Far North' });
  colliders.push({ minX: 73.8, maxX: 74.8, minZ: -63.4, maxZ: -38.0, label: 'East Canal Embankment North' });
  colliders.push({ minX: 73.8, maxX: 74.8, minZ: -34.0, maxZ: -15.5, label: 'East Canal Embankment Ghat North' });
  colliders.push({ minX: 73.8, maxX: 74.8, minZ: -4.5, maxZ: -2.6, label: 'East Canal Embankment Ghat South' });
  colliders.push({ minX: 73.8, maxX: 74.8, minZ: 6.6, maxZ: 35.0, label: 'East Canal Embankment Central South' });
  colliders.push({ minX: 73.8, maxX: 74.8, minZ: 43.4, maxZ: 110, label: 'East Canal Embankment Far South' });

  // Moored Traditional Country Boats (নৌকা)
  const boatMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
  const boatHoodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 });
  const makeBoat = (bx: number, bz: number, rotY: number) => {
    const boat = new THREE.Group();
    boat.position.set(bx, -0.12, bz);
    boat.rotation.y = rotY;

    // Curved Hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.38, 4.2), boatMat);
    hull.castShadow = true;
    const prow = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 4), boatMat);
    prow.rotation.x = -Math.PI / 2;
    prow.position.set(0, 0.05, 2.5);
    const stern = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.0, 4), boatMat);
    stern.rotation.x = Math.PI / 2;
    stern.position.set(0, 0.05, -2.4);

    // Bamboo reed canopy (ছই)
    const canopy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 2.2, 12, 1, false, 0, Math.PI),
      boatHoodMat
    );
    canopy.rotation.z = Math.PI / 2;
    canopy.position.set(0, 0.35, 0);
    canopy.castShadow = true;

    boat.add(hull, prow, stern, canopy);
    scene.add(boat);
  };
  makeBoat(67.5, -12.0, 0.12);
  makeBoat(66.8, 12.0, -0.08);
  makeBoat(67.2, -44.0, 0.2);

  namedZones.push({
    id: 'zone_river_ghat',
    label: '🌊 মেঘনা নদী ঘাট ও ক্যানেল • Meghna Riverfront & Ghat',
    minX: 58,
    maxX: 76,
    minZ: -110,
    maxZ: 110
  });

  const concreteBridgeDeckMat = new THREE.MeshStandardMaterial({
    map: asphaltMat.map,
    roughness: 0.85,
    metalness: 0.08
  });
  const curbYellowWhiteMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.75 });
  const concretePillarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const bridgeRailMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.5, roughness: 0.4 });
  const steelTrussMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.75, roughness: 0.3 });

  // Helper for Bridge Streetlamps
  const makeBridgeLamp = (lx: number, lz: number, ly: number) => {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 })
    );
    post.position.set(lx, ly + 1.6, lz);
    post.castShadow = true;
    const bMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 0
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), bMat);
    bulb.position.set(lx, ly + 3.2, lz);
    const light = new THREE.PointLight(0xffedd5, 0, 14);
    light.position.copy(bulb.position);
    scene.add(post, bulb, light);
    streetLights.push(light);
    streetBulbMats.push(bMat);
  };

  // =========================================================================
  // 1. MAIN CONCRETE VEHICULAR BRIDGE (পাক্কা কংক্রিট আর্চ সেতু)
  // Spanning x = 45..81 along z = 2.0 (span 36m, width 8.6m, apex y = 1.12m)
  // Matches WorldPhysics.BRIDGES[0]
  // =========================================================================

  // Heavy concrete piers in the canal
  const cPier1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.0, 9.2), concretePillarMat);
  cPier1.position.set(58.0, -0.6, 2.0);
  cPier1.castShadow = true;
  const cPier2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.0, 9.2), concretePillarMat);
  cPier2.position.set(68.0, -0.6, 2.0);
  cPier2.castShadow = true;
  scene.add(cPier1, cPier2);

  // Continuous arched asphalt deck (18 overlapping segments with zero gaps!)
  const numConcreteSegs = 18;
  const segDx = 36.0 / numConcreteSegs; // 2.0m
  for (let i = 0; i < numConcreteSegs; i++) {
    const sx = 45.0 + (i + 0.5) * segDx;
    const norm = (sx - 63.0) / 18.0;
    const arch = Math.max(0, 1 - norm * norm);
    const sy = 0.04 + arch * 1.08;
    const slope = -2 * norm * 1.08 / 18.0;

    const deckSeg = new THREE.Mesh(new THREE.BoxGeometry(segDx + 0.12, 0.24, 8.6), concreteBridgeDeckMat);
    deckSeg.position.set(sx, sy - 0.08, 2.0);
    deckSeg.rotation.z = Math.atan(slope);
    deckSeg.receiveShadow = true;
    deckSeg.castShadow = true;
    scene.add(deckSeg);

    // North & South concrete curb stripes
    const curbN = new THREE.Mesh(new THREE.BoxGeometry(segDx + 0.12, 0.28, 0.8), curbYellowWhiteMat);
    curbN.position.set(sx, sy + 0.06, -1.9);
    curbN.rotation.z = Math.atan(slope);
    const curbS = new THREE.Mesh(new THREE.BoxGeometry(segDx + 0.12, 0.28, 0.8), curbYellowWhiteMat);
    curbS.position.set(sx, sy + 0.06, 5.9);
    curbS.rotation.z = Math.atan(slope);
    scene.add(curbN, curbS);

    // Railing posts
    const postN = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.22), bridgeRailMat);
    postN.position.set(sx, sy + 0.52, -2.3);
    postN.castShadow = true;
    const postS = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.22), bridgeRailMat);
    postS.position.set(sx, sy + 0.52, 6.3);
    postS.castShadow = true;
    scene.add(postN, postS);
  }

  // Continuous safety railings on North (z = -2.3) and South (z = 6.3)
  const cRailN = new THREE.Mesh(new THREE.BoxGeometry(36.2, 0.16, 0.2), bridgeRailMat);
  cRailN.position.set(63.0, 1.62, -2.3);
  cRailN.castShadow = true;
  const cRailS = new THREE.Mesh(new THREE.BoxGeometry(36.2, 0.16, 0.2), bridgeRailMat);
  cRailS.position.set(63.0, 1.62, 6.3);
  cRailS.castShadow = true;
  scene.add(cRailN, cRailS);

  // Railing solid collision boundaries
  colliders.push({ minX: 45.0, maxX: 81.0, minZ: -2.6, maxZ: -2.0, label: 'Concrete Bridge North Rail' });
  colliders.push({ minX: 45.0, maxX: 81.0, minZ: 6.0, maxZ: 6.6, label: 'Concrete Bridge South Rail' });

  // 4 Glowing streetlamps on bridge piers
  makeBridgeLamp(56.0, -2.2, 0.85);
  makeBridgeLamp(70.0, -2.2, 0.85);
  makeBridgeLamp(56.0, 6.2, 0.85);
  makeBridgeLamp(70.0, 6.2, 0.85);

  roads.push({ x: 63.0, z: 2.0, width: 36.0, depth: 8.6, kind: 'asphalt' });
  buildings.push({
    id: 'bridge_concrete',
    nameBn: 'পাক্কা কংক্রিট সেতু',
    nameEn: 'Main Concrete Bridge',
    x: 63.0,
    z: 2.0,
    width: 36.0,
    depth: 8.6,
    color: '#cbd5e1',
    kind: 'bridge',
    icon: '🌉',
    categoryBn: 'সেতু ও প্রধান সংযোগ সড়ক',
    categoryEn: 'Main Concrete Arch Bridge',
    descriptionBn: 'মেঘনা খালের ওপর নির্মিত শক্তিশালী কংক্রিট আর্চ সেতু। মূল বাজার সড়ক ও নদীর ওপাড়ের নতুন আবাসিক এলাকাকে যুক্ত করেছে। গাড়ি, ট্রাক, রিকশা ও মানুষ চলাচল করে।',
    accessible: true
  });

  // =========================================================================
  // 2. TRADITIONAL BAMBOO FOOTBRIDGE (গ্রামীণ বাঁশের সাঁকো)
  // Spanning x = 47..79 along z = -36.0 (span 32m, width 3.2m, apex y = 0.44m)
  // Matches WorldPhysics.BRIDGES[1]
  // =========================================================================
  const bambooPlankMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.85 });
  const bambooPoleMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.8 });

  // Continuous bamboo planking with approach ramps
  const bRampW = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.16, 3.2), bambooPlankMat);
  bRampW.position.set(50.0, 0.24, -36.0);
  bRampW.rotation.z = -Math.atan(0.40 / 6.0);
  bRampW.receiveShadow = true;
  bRampW.castShadow = true;
  const bDeckMid = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.16, 3.2), bambooPlankMat);
  bDeckMid.position.set(63.0, 0.44, -36.0);
  bDeckMid.receiveShadow = true;
  bDeckMid.castShadow = true;
  const bRampE = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.16, 3.2), bambooPlankMat);
  bRampE.position.set(76.0, 0.24, -36.0);
  bRampE.rotation.z = Math.atan(0.40 / 6.0);
  bRampE.receiveShadow = true;
  bRampE.castShadow = true;
  scene.add(bRampW, bDeckMid, bRampE);

  // Bamboo support pilings driven into water
  const footPilingsX = [52.0, 58.0, 63.0, 68.0, 74.0];
  for (const px of footPilingsX) {
    const pile1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.8, 6), bambooPoleMat);
    pile1.position.set(px, -0.4, -36.0 - 1.35);
    pile1.rotation.z = 0.06;
    const pile2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.8, 6), bambooPoleMat);
    pile2.position.set(px, -0.4, -36.0 + 1.35);
    pile2.rotation.z = -0.06;
    scene.add(pile1, pile2);
  }

  // Bamboo handrails on North and South
  const footRailN = new THREE.Mesh(new THREE.BoxGeometry(32.2, 0.1, 0.1), bambooPoleMat);
  footRailN.position.set(63.0, 1.45, -37.55);
  const footRailS = new THREE.Mesh(new THREE.BoxGeometry(32.2, 0.1, 0.1), bambooPoleMat);
  footRailS.position.set(63.0, 1.45, -34.45);
  scene.add(footRailN, footRailS);

  // Railing colliders
  colliders.push({ minX: 47.0, maxX: 79.0, minZ: -37.9, maxZ: -37.3, label: 'Bamboo Bridge North Rail' });
  colliders.push({ minX: 47.0, maxX: 79.0, minZ: -34.7, maxZ: -34.1, label: 'Bamboo Bridge South Rail' });

  roads.push({ x: 63.0, z: -36.0, width: 32.0, depth: 3.2, kind: 'lane' });
  buildings.push({
    id: 'bridge_bamboo',
    nameBn: 'বাঁশের সাঁকো ও কাঠের সেতু',
    nameEn: 'Village Bamboo Footbridge',
    x: 63.0,
    z: -36.0,
    width: 32.0,
    depth: 3.2,
    color: '#9a7b4f',
    kind: 'bridge',
    icon: '🪵',
    categoryBn: 'পায়ে হাঁটার গ্রামীণ সাঁকো',
    categoryEn: 'Pedestrian Bamboo Footbridge',
    descriptionBn: 'উত্তর পাড়ার খালের ওপর ঐতিহ্যবাহী বাঁশ ও কাঠের সাঁকো। গ্রাম্য মেঠোপথ দিয়ে ওপাড়ের নদী তীরবর্তী পল্লীতে যাওয়ার মনোরম পথ।',
    accessible: true
  });

  // =========================================================================
  // 3. SOUTH CULVERT VEHICULAR BRIDGE (দক্ষিণ কালভার্ট সেতু)
  // Spanning x = 48..78 along z = 39.2 (span 30m, width 7.6m, apex y = 0.32m)
  // Matches WorldPhysics.BRIDGES[2]
  // =========================================================================
  const cRampW = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 7.6), concreteBridgeDeckMat);
  cRampW.position.set(50.5, 0.18, 39.2);
  cRampW.rotation.z = -Math.atan(0.28 / 5.0);
  const cDeckMid = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.22, 7.6), concreteBridgeDeckMat);
  cDeckMid.position.set(63.0, 0.32, 39.2);
  const cRampE = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 7.6), concreteBridgeDeckMat);
  cRampE.position.set(75.5, 0.18, 39.2);
  cRampE.rotation.z = Math.atan(0.28 / 5.0);
  scene.add(cRampW, cDeckMid, cRampE);

  const culvertPier1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.2, 8.2), concretePillarMat);
  culvertPier1.position.set(58.0, -0.5, 39.2);
  const culvertPier2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.2, 8.2), concretePillarMat);
  culvertPier2.position.set(68.0, -0.5, 39.2);
  scene.add(culvertPier1, culvertPier2);

  // Red & white safety curbs along North (z = 35.4) and South (z = 43.0)
  const culvertCurbMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.7 });
  const cCurbN = new THREE.Mesh(new THREE.BoxGeometry(30.2, 0.85, 0.4), culvertCurbMat);
  cCurbN.position.set(63.0, 0.85, 35.4);
  const cCurbS = new THREE.Mesh(new THREE.BoxGeometry(30.2, 0.85, 0.4), culvertCurbMat);
  cCurbS.position.set(63.0, 0.85, 43.0);
  scene.add(cCurbN, cCurbS);

  colliders.push({ minX: 48.0, maxX: 78.0, minZ: 35.1, maxZ: 35.7, label: 'Culvert North Curb' });
  colliders.push({ minX: 48.0, maxX: 78.0, minZ: 42.7, maxZ: 43.3, label: 'Culvert South Curb' });

  roads.push({ x: 63.0, z: 39.2, width: 30.0, depth: 7.6, kind: 'asphalt' });
  buildings.push({
    id: 'bridge_culvert',
    nameBn: 'দক্ষিণ কালভার্ট সেতু',
    nameEn: 'South Culvert Bridge',
    x: 63.0,
    z: 39.2,
    width: 30.0,
    depth: 7.6,
    color: '#94a3b8',
    kind: 'bridge',
    icon: '🌉',
    categoryBn: 'কালভার্ট ও দক্ষিণ সংযোগ সেতু',
    categoryEn: 'Vehicular Culvert Bridge',
    descriptionBn: 'দক্ষিণ বাণিজ্যিক সড়ক ও ওপাড়ের সংযোগকারী পাকা কালভার্ট সেতু। পিকআপ, রিকশা ও পথচারী চলাচল করে।',
    accessible: true
  });

  // =========================================================================
  // 4. NORTH STEEL TRUSS BRIDGE (উত্তর স্টিল ট্রাস সেতু)
  // Spanning x = 45..81 along z = -68.0 (span 36m, width 8.2m, apex y = 1.25m)
  // Matches WorldPhysics.BRIDGES[3]
  // =========================================================================
  const tPier1 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.2, 8.8), concretePillarMat);
  tPier1.position.set(58.0, -0.6, -68.0);
  const tPier2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.2, 8.8), concretePillarMat);
  tPier2.position.set(68.0, -0.6, -68.0);
  scene.add(tPier1, tPier2);

  // Arched roadway deck
  for (let i = 0; i < numConcreteSegs; i++) {
    const sx = 45.0 + (i + 0.5) * segDx;
    const norm = (sx - 63.0) / 18.0;
    const arch = Math.max(0, 1 - norm * norm);
    const sy = 0.04 + arch * 1.21;
    const slope = -2 * norm * 1.21 / 18.0;

    const tSeg = new THREE.Mesh(new THREE.BoxGeometry(segDx + 0.12, 0.24, 8.2), concreteBridgeDeckMat);
    tSeg.position.set(sx, sy - 0.08, -68.0);
    tSeg.rotation.z = Math.atan(slope);
    tSeg.receiveShadow = true;
    tSeg.castShadow = true;
    scene.add(tSeg);

    // Steel Vertical Truss Posts
    const trussH = 2.4 + arch * 1.2;
    const vPostN = new THREE.Mesh(new THREE.BoxGeometry(0.16, trussH, 0.16), steelTrussMat);
    vPostN.position.set(sx, sy + trussH / 2, -72.1);
    vPostN.castShadow = true;
    const vPostS = new THREE.Mesh(new THREE.BoxGeometry(0.16, trussH, 0.16), steelTrussMat);
    vPostS.position.set(sx, sy + trussH / 2, -63.9);
    vPostS.castShadow = true;
    scene.add(vPostN, vPostS);

    // Overhead Portal Cross Beams
    if (i % 3 === 0) {
      const portal = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 8.4), steelTrussMat);
      portal.position.set(sx, sy + trussH, -68.0);
      scene.add(portal);
    }
  }

  // Steel top chords & continuous railings
  const trussTopN = new THREE.Mesh(new THREE.BoxGeometry(36.2, 0.2, 0.2), steelTrussMat);
  trussTopN.position.set(63.0, 4.4, -72.1);
  const trussTopS = new THREE.Mesh(new THREE.BoxGeometry(36.2, 0.2, 0.2), steelTrussMat);
  trussTopS.position.set(63.0, 4.4, -63.9);
  scene.add(trussTopN, trussTopS);

  colliders.push({ minX: 45.0, maxX: 81.0, minZ: -72.5, maxZ: -71.8, label: 'Truss North Rail' });
  colliders.push({ minX: 45.0, maxX: 81.0, minZ: -64.2, maxZ: -63.5, label: 'Truss South Rail' });

  makeBridgeLamp(56.0, -72.0, 0.95);
  makeBridgeLamp(70.0, -72.0, 0.95);
  makeBridgeLamp(56.0, -64.0, 0.95);
  makeBridgeLamp(70.0, -64.0, 0.95);

  roads.push({ x: 63.0, z: -68.0, width: 36.0, depth: 8.2, kind: 'asphalt' });
  buildings.push({
    id: 'bridge_steel_truss',
    nameBn: 'উত্তর স্টিল ট্রাস সেতু',
    nameEn: 'North Steel Truss Bridge',
    x: 63.0,
    z: -68.0,
    width: 36.0,
    depth: 8.2,
    color: '#0284c7',
    kind: 'bridge',
    icon: '🌉',
    categoryBn: 'স্টিল ট্রাস ও উত্তর সংযোগ সেতু',
    categoryEn: 'Steel Truss Highway Bridge',
    descriptionBn: 'মেঘনা খালের উত্তর প্রান্তের আধুনিক ব্লু স্টিল ট্রাস সেতু। উত্তর পাড়ার ভারী যান ও ট্রাফিক ওপাড়ের কৃষি পল্লীতে দ্রুত পৌঁছে দেয়।',
    accessible: true
  });

  // =========================================================================
  // 3C. NEW EAST RIVERSIDE DISTRICT (নদী তীরবর্তী নতুন পাড়া)
  // =========================================================================

  // 1. Bareq Mama's Riverbank Tong Dokan (নতুন বারেক মামার টং)
  buildTongDokan({
    id: 'tong_bareq',
    nameBn: 'বারেক মামার নদী তীরের টং',
    signTitle: 'বারেক মামার টং',
    signSub: 'নদীর বাতাস • স্পেশাল মালাই চা ও বিস্কুট',
    signBg: '#065f46',
    x: 87.0,
    z: 7.2,
    faceNorth: true,
    ownerNpcId: 'bareq_mama',
    ownerNameBn: 'বারেক মামা',
    roofMat: tinMatGreen,
    chairMat1: tongBlueMat,
    chairMat2: tongWoodMat,
    includePointLight: true
  });

  // 2. Meghna View Mess (মেঘনা ভিউ মেস ভবন)
  buildBuilding({
    id: 'mess_meghna',
    nameBn: 'মেঘনা ভিউ মেস ভবন',
    kind: 'mess',
    x: 93.0,
    z: -16.0,
    w: 11.0,
    h: 7.2,
    d: 8.5,
    wallHex: '#e0e7ff',
    faceDir: 'west',
    waterTank: true
  });

  // 3. Greenfield Cricket Ground & Pavilion (বটতলা খেলার মাঠ ও ক্রিকেট পিচ)
  const cricketFieldMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });
  const cricketField = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.05, 18.0), cricketFieldMat);
  cricketField.position.set(93.0, 0.035, 20.0);
  cricketField.receiveShadow = true;
  scene.add(cricketField);

  // Clay pitch
  const clayPitchMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.95 });
  const pitch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 12.0), clayPitchMat);
  pitch.position.set(93.0, 0.045, 20.0);
  pitch.receiveShadow = true;
  scene.add(pitch);

  // Wooden wickets & bails
  const stumpMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });
  const makeWickets = (wz: number) => {
    for (let sIdx = -1; sIdx <= 1; sIdx++) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 6), stumpMat);
      st.position.set(93.0 + sIdx * 0.12, 0.4, wz);
      scene.add(st);
    }
  };
  makeWickets(14.8);
  makeWickets(25.2);

  namedZones.push({
    id: 'zone_cricket_ground',
    label: '🏏 সবুজ খেলার মাঠ ও ক্রিকেট পিচ • Greenfield Cricket Ground',
    minX: 82.0,
    maxX: 104.0,
    minZ: 11.0,
    maxZ: 29.0
  });

  buildings.push({
    id: 'cricket_ground',
    nameBn: 'সবুজ খেলার মাঠ ও ক্রিকেট পিচ',
    nameEn: 'Greenfield Cricket Ground',
    x: 93.0,
    z: 20.0,
    width: 22.0,
    depth: 18.0,
    color: '#15803d',
    kind: 'park',
    icon: '🏏',
    categoryBn: 'খেলার মাঠ ও পার্ক',
    categoryEn: 'Cricket Ground & Sports Park',
    descriptionBn: 'পাড়ার তরুণদের পছন্দের ক্রিকেট মাঠ। শুক্রবার বিকেলে এখানে জমজমাট প্রীতি ম্যাচ অনুষ্ঠিত হয়।',
    accessible: true
  });

  // 4. Padma Villa (পদ্মা ভিলা - আবাসিক বাড়ি)
  buildBuilding({
    id: 'house_padma',
    nameBn: 'পদ্মা ভিলা',
    kind: 'house',
    x: 93.0,
    z: -48.0,
    w: 10.0,
    h: 6.4,
    d: 7.5,
    wallHex: '#fef3c7',
    faceDir: 'west',
    waterTank: true
  });

  // 5. Surma Cottage (সুরমা কটেজ - আবাসিক বাড়ি)
  buildBuilding({
    id: 'house_surma',
    nameBn: 'সুরমা কটেজ',
    kind: 'house',
    x: 93.0,
    z: 52.0,
    w: 10.0,
    h: 6.4,
    d: 7.5,
    wallHex: '#dcfce7',
    faceDir: 'west',
    waterTank: true
  });

  // 6. River Ghat Stone Landing Steps (নদী ঘাট)
  const ghatStoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
  const ghatSteps = [
    { y: -0.05, w: 5.5, d: 2.2, z: -10.0, x: 74.0 },
    { y: -0.12, w: 5.5, d: 2.2, z: -10.0, x: 72.8 },
    { y: -0.19, w: 5.5, d: 2.2, z: -10.0, x: 71.6 }
  ];
  for (const step of ghatSteps) {
    const sMesh = new THREE.Mesh(new THREE.BoxGeometry(step.d, 0.12, step.w), ghatStoneMat);
    sMesh.position.set(step.x, step.y, step.z);
    sMesh.receiveShadow = true;
    scene.add(sMesh);
  }

  buildings.push({
    id: 'river_ghat',
    nameBn: 'মেঘনা নদী ঘাট ও নৌকা চত্বর',
    nameEn: 'Meghna River Ghat',
    x: 74.0,
    z: -10.0,
    width: 6.0,
    depth: 8.0,
    color: '#0284c7',
    kind: 'river',
    icon: '⛵',
    categoryBn: 'নদী ঘাট ও নৌকা ঘাট',
    categoryEn: 'River Ghat & Boat Landing',
    descriptionBn: 'ঐতিহ্যবাহী পাথুরে নদী ঘাট। জেলেরা মাছ নিয়ে আসে এবং দেশি কাঠের নৌকা বাঁধা থাকে। নদীর হাওয়া উপভোগের চমৎকার জায়গা।',
    accessible: true
  });

  // =========================================================================
  // 4. INTERACTIVE ENVIRONMENTAL OBJECTS (RICKSHAWS, TUBEWELL, BENCHES, NOTICE BOARD)
  // =========================================================================

  // 4A) Three Iconic Bangladeshi Cycle Rickshaws (with interactive bell & UNESCO folk art!)
  const buildRickshaw = (
    id: string,
    rx: number,
    rz: number,
    rotY: number,
    hoodHex: number,
    artVariant: 'tiger' | 'peacock' | 'village' = 'tiger',
    frameHex = 0x047857
  ) => {
    const res = buildAuthenticRickshaw({
      id,
      frameColor: frameHex,
      hoodColor: hoodHex,
      hoodFrillColor: 0xfacc15,
      seatColor: 0x1e3a8a,
      artVariant,
      hasPuller: false
    });
    const g = res.root;
    g.position.set(rx, 0, rz);
    g.rotation.y = rotY;
    scene.add(g);
    colliders.push({ minX: rx - 0.9, maxX: rx + 0.9, minZ: rz - 0.9, maxZ: rz + 0.9 });

    interactables.push({
      id,
      type: 'rickshaw_bell',
      labelBn: 'রিকশার ঘণ্টা বাজান (টুং-টাং)',
      labelEn: 'Ring Rickshaw Bell',
      icon: '🔔',
      position: new THREE.Vector3(rx, 1.0, rz),
      radius: 2.3
    });
  };

  // Rickshaw 1: Near Rafiq's Tong Dokan along Main Road, parked facing East towards bridge
  buildRickshaw('rickshaw_1', 3.8, -1.35, Math.PI / 2 - 0.06, 0xdc2626, 'tiger', 0x047857);
  // Rickshaw 2: Near Al-Amin Grocery & South Commercial Plaza, parked facing West
  buildRickshaw('rickshaw_2', 29.8, 5.8, -Math.PI / 2 + 0.10, 0x2563eb, 'peacock', 0x0284c7);
  // Rickshaw 3: Near West Mess & Hardware Store, parked facing South-West
  buildRickshaw('rickshaw_3', -48.0, 5.6, -Math.PI * 0.45 + Math.PI / 2, 0x059669, 'village', 0xd97706);

  // 4B) Interactive Bangladeshi Tube Well (নলকূপ) in Banyan Courtyard
  const twX = -5.6;
  const twZ = 15.8;
  addBox(1.5, 0.14, 1.5, twX, 0.07, twZ, curbMat, false, false);
  const twMat = new THREE.MeshStandardMaterial({ color: 0x166534, metalness: 0.45, roughness: 0.45 });
  const twBody = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.95, 10), twMat);
  twBody.position.set(twX, 0.55, twZ);
  twBody.castShadow = true;
  const twSpout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.08), twMat);
  twSpout.position.set(twX - 0.14, 0.72, twZ);
  const twHandle = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.06), twMat);
  twHandle.position.set(twX + 0.24, 0.95, twZ);
  twHandle.rotation.z = 0.28;
  scene.add(twBody, twSpout, twHandle);
  colliders.push({ minX: twX - 0.35, maxX: twX + 0.35, minZ: twZ - 0.35, maxZ: twZ + 0.35 });

  interactables.push({
    id: 'courtyard_tubewell',
    type: 'tubewell',
    labelBn: 'নলকূপের ঠান্ডা পানিতে মুখ ধুন',
    labelEn: 'Splash Cool Water (Tube Well)',
    icon: '💧',
    position: new THREE.Vector3(twX, 0.8, twZ),
    radius: 2.3
  });

  // 4C) Community Notice Board at Central Crossing
  const nbX = -2.8;
  const nbZ = 5.4;
  addBox(0.08, 1.9, 0.08, nbX - 0.65, 0.95, nbZ, woodDark, false);
  addBox(0.08, 1.9, 0.08, nbX + 0.65, 0.95, nbZ, woodDark, false);
  const nbTex = createBengaliSignTexture({
    bg: '#1e3a8a',
    border: '#facc15',
    title: 'পাড়ার নোটিশ বোর্ড',
    subtitle: 'শুক্রবার ক্রিকেট ম্যাচ • পরিচ্ছন্ন পাড়া',
    titleColor: '#fef08a',
    subtitleColor: '#e0f2fe',
    width: 384,
    height: 192
  });
  const nbBoard = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.85, 0.08),
    new THREE.MeshStandardMaterial({ map: nbTex })
  );
  nbBoard.position.set(nbX, 1.45, nbZ);
  scene.add(nbBoard);
  colliders.push({ minX: nbX - 0.8, maxX: nbX + 0.8, minZ: nbZ - 0.25, maxZ: nbZ + 0.25 });

  interactables.push({
    id: 'notice_board',
    type: 'notice_board',
    labelBn: 'পাড়ার নোটিশ বোর্ড পড়ুন',
    labelEn: 'Read Notice Board',
    icon: '📋',
    position: new THREE.Vector3(nbX, 1.2, nbZ),
    radius: 2.3
  });

  // 4D) Outdoor Sittable Benches across Courtyards & Mess Yards
  const addOutdoorBench = (id: string, bx: number, bz: number, rotY: number, labelBn: string) => {
    const g = new THREE.Group();
    g.position.set(bx, 0.06, bz);
    g.rotation.y = rotY;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.09, 0.48), tongWoodMat);
    top.position.y = 0.46;
    top.castShadow = true;
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.42), curbMat);
    leg1.position.set(-0.7, 0.22, 0);
    const leg2 = leg1.clone();
    leg2.position.x = 0.7;
    g.add(top, leg1, leg2);
    scene.add(g);

    interactables.push({
      id,
      type: 'outdoor_bench',
      labelBn,
      labelEn: 'Sit on Bench',
      icon: '🪑',
      position: new THREE.Vector3(bx, 0.5, bz),
      radius: 2.1,
      sitPosition: new THREE.Vector3(bx, 0.06, bz),
      sitFacing: rotY
    });
  };
  addOutdoorBench('bench_courtyard', -10.5, 14.5, Math.PI / 2, 'বটতলার বেঞ্চে বসুন');
  addOutdoorBench('bench_north_mess', -10.5, -26.5, 0, 'অরুণোদয় মেসের বেঞ্চে বসুন');
  addOutdoorBench('bench_club', 12.5, -26.2, 0, 'পাঠাগারের সামনে বসুন');
  addOutdoorBench('bench_kashem', -44.5, -0.6, 0, 'কাশেমের টংয়ের বেঞ্চে বসুন');
  addOutdoorBench('bench_north_park', 0.0, -40.5, Math.PI, 'উত্তর উদ্যান বেঞ্চে বসুন');
  addOutdoorBench('bench_south_ground', -12.5, 40.5, 0, 'দক্ষিণ কলোনি বেঞ্চে বসুন');
  addOutdoorBench('bench_river_1', 80.0, -22.0, Math.PI / 2, 'নদীর পাড়ের বেঞ্চে বসুন');
  addOutdoorBench('bench_river_2', 80.0, 16.0, Math.PI / 2, 'নদীর পাড়ের বেঞ্চে বসুন');

  // Named Courtyard & Street Zones
  namedZones.push({
    id: 'bottola_courtyard',
    label: '🌳 বটতলা চত্বর • Banyan Courtyard',
    minX: -13.2,
    maxX: -3.2,
    minZ: 9.0,
    maxZ: 18.6
  });
  namedZones.push({
    id: 'north_mess_yard',
    label: '🏘️ উত্তর পাড়া মেস চত্বর • North Mess Yard',
    minX: -20,
    maxX: 20,
    minZ: -37,
    maxZ: -18
  });
  namedZones.push({
    id: 'east_bazar',
    label: '🏪 পূর্ব বাজার মোড় • East Bazar',
    minX: 24,
    maxX: 46,
    minZ: -18,
    maxZ: 22
  });
  namedZones.push({
    id: 'west_para',
    label: '🏘️ পশ্চিম পাড়া • West Neighborhood',
    minX: -46,
    maxX: -24,
    minZ: -18,
    maxZ: 22
  });
  namedZones.push({
    id: 'south_para',
    label: '🏡 দক্ষিণ আবাসিক এলাকা • South Colony',
    minX: -44,
    maxX: 44,
    minZ: 22,
    maxZ: 39
  });
  namedZones.push({
    id: 'kashem_tong_plaza',
    label: '🍵 কাশেমের টং চত্বর • Kashem Plaza',
    minX: -50,
    maxX: -34,
    minZ: -6,
    maxZ: 6,
    isTong: true,
    tongOwnerId: 'kashem_bhai'
  });
  namedZones.push({
    id: 'far_west_para',
    label: '🏘️ পশ্চিম বিস্তার কলোনি • West Colony',
    minX: -74,
    maxX: -46,
    minZ: -42,
    maxZ: 42
  });
  namedZones.push({
    id: 'far_east_bazar',
    label: '🏪 পূর্ব বাণিজ্যিক এলাকা • East Commercial Area',
    minX: 46,
    maxX: 74,
    minZ: -42,
    maxZ: 42
  });
  namedZones.push({
    id: 'north_lane_suburb',
    label: '🏡 উত্তর আবাসিক লেন • North Residential Lane',
    minX: -70,
    maxX: 70,
    minZ: -60,
    maxZ: -38
  });
  namedZones.push({
    id: 'south_park_colony',
    label: '🌳 দক্ষিণ উদ্যান ও কলোনি • South Colony & Park',
    minX: -70,
    maxX: 70,
    minZ: 38,
    maxZ: 60
  });

  // =========================================================================
  // 5. ELECTRIC POLES, OVERHEAD WIRES & AUTOMATIC STREETLIGHTS (14 POLES!)
  // =========================================================================
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
  const armMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, 6.6, 7);
  const crossArmGeo = new THREE.BoxGeometry(1.3, 0.08, 0.1);
  const lampArmGeo = new THREE.BoxGeometry(0.08, 0.08, 1.15);
  const lampHeadGeo = new THREE.BoxGeometry(0.35, 0.1, 0.24);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x111827 });

  const addWire = (a: THREE.Vector3, b: THREE.Vector3, sag = 0.6) => {
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
    scene.add(new THREE.Line(geo, wireMat));
  };

  const placePoleRow = (
    points: [number, number, boolean][],
    lampDirZ: number,
    connectWires: boolean
  ) => {
    const vecs: THREE.Vector3[] = [];
    for (const [px, pz, withLight] of points) {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(px, 3.3, pz);
      pole.castShadow = true;
      scene.add(pole);
      colliders.push({ minX: px - 0.24, maxX: px + 0.24, minZ: pz - 0.24, maxZ: pz + 0.24 });

      const cross = new THREE.Mesh(crossArmGeo, armMat);
      cross.position.set(px, 6.1, pz);
      const lArm = new THREE.Mesh(lampArmGeo, armMat);
      lArm.position.set(px, 5.45, pz + lampDirZ * 0.55);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: 0xffb74d,
        emissiveIntensity: 0
      });
      streetBulbMats.push(bMat);
      const head = new THREE.Mesh(lampHeadGeo, bMat);
      head.position.set(px, 5.38, pz + lampDirZ * 1.05);
      scene.add(cross, lArm, head);

      if (withLight) {
        const sLight = new THREE.PointLight(0xffb74d, 0, 22, 1.45);
        sLight.position.set(px, 5.1, pz + lampDirZ * 1.15);
        scene.add(sLight);
        streetLights.push(sLight);
      }
      vecs.push(new THREE.Vector3(px, 6.1, pz));
    }
    if (connectWires) {
      for (let i = 0; i < vecs.length - 1; i++) {
        for (const off of [-0.42, 0, 0.42]) {
          addWire(
            new THREE.Vector3(vecs[i].x + off, 6.1, vecs[i].z),
            new THREE.Vector3(vecs[i + 1].x + off, 6.1, vecs[i + 1].z),
            0.55 + Math.abs(off) * 0.25
          );
        }
      }
    }
  };

  // Main Bazar Road poles across 150m length
  placePoleRow(
    [
      [-62, -1.0, false],
      [-40, -1.0, false],
      [-23, -1.0, true],
      [-6.2, -1.0, true],
      [6.2, -1.0, false],
      [22.5, -1.0, true],
      [39.5, -1.0, false],
      [62, -1.0, true]
    ],
    1,
    true
  );
  // North Cross Street poles
  placePoleRow(
    [
      [-60, -22.5, false],
      [-32, -22.5, false],
      [-8, -22.5, true],
      [14, -22.5, false],
      [34, -22.5, false],
      [60, -22.5, true]
    ],
    1,
    true
  );
  // South Residential Street poles
  placePoleRow(
    [
      [-60, 26.5, false],
      [-32, 26.5, false],
      [-8, 26.5, true],
      [14, 26.5, false],
      [34, 26.5, false],
      [60, 26.5, true]
    ],
    -1,
    true
  );
  // Far North Lane poles
  placePoleRow(
    [
      [-48, -48.0, false],
      [-16, -48.0, true],
      [16, -48.0, false],
      [48, -48.0, true]
    ],
    1,
    true
  );
  // Far South Colony poles
  placePoleRow(
    [
      [-48, 48.0, false],
      [-16, 48.0, true],
      [16, 48.0, false],
      [48, 48.0, true]
    ],
    -1,
    true
  );

  // Service drop wires to Mess & Tong Dokans
  addWire(new THREE.Vector3(-6.2, 5.9, -1.0), new THREE.Vector3(-7.0, 4.9, -6.7), 0.45);
  addWire(new THREE.Vector3(6.2, 5.9, -1.0), new THREE.Vector3(8.5, 2.8, -3.5), 0.4);
  addWire(new THREE.Vector3(39.5, 5.9, -1.0), new THREE.Vector3(35.5, 2.8, -3.8), 0.45);
  addWire(new THREE.Vector3(-40.0, 5.9, -1.0), new THREE.Vector3(-42.0, 2.8, -3.5), 0.4);

  // =========================================================================
  // 6. OPTIMIZED SHARED-GEOMETRY GREENERY (MANGO, BANYAN, COCONUT PALMS, BANANAS)
  // =========================================================================
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.95 });
  const leafDark = new THREE.MeshStandardMaterial({ color: 0x265c2b, roughness: 0.86 });
  const leafMid = new THREE.MeshStandardMaterial({ color: 0x357a38, roughness: 0.84 });
  const leafBright = new THREE.MeshStandardMaterial({ color: 0x4d9444, roughness: 0.82 });
  const bananaStemMat = new THREE.MeshStandardMaterial({ color: 0x65a30d, roughness: 0.85 });

  const mangoTrunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.8, 7);
  const puffGeo = new THREE.DodecahedronGeometry(1.0, 1);
  const palmTrunkGeo = new THREE.CylinderGeometry(0.14, 0.24, 6.2, 7);
  const frondGeo = new THREE.BoxGeometry(2.1, 0.06, 0.36);
  const bananaStemGeo = new THREE.CylinderGeometry(0.11, 0.16, 1.8, 6);
  const bananaLeafGeo = new THREE.BoxGeometry(1.35, 0.04, 0.38);

  const addMangoTree = (tx: number, tz: number, scale = 1) => {
    const g = new THREE.Group();
    g.position.set(tx, 0, tz);
    g.scale.setScalar(scale);
    const trunk = new THREE.Mesh(mangoTrunkGeo, trunkMat);
    trunk.position.y = 1.4;
    trunk.castShadow = true;
    g.add(trunk);

    const canopy = new THREE.Group();
    canopy.position.y = 3.1;
    const puffs: [number, number, number, number, THREE.Material][] = [
      [0, 0.3, 0, 1.55, leafMid],
      [-0.85, -0.1, 0.5, 1.15, leafDark],
      [0.9, 0.0, -0.4, 1.2, leafBright],
      [0.2, 0.75, 0.65, 1.05, leafBright]
    ];
    for (const [px, py, pz, r, m] of puffs) {
      const s = new THREE.Mesh(puffGeo, m);
      s.position.set(px, py, pz);
      s.scale.setScalar(r);
      s.castShadow = true;
      canopy.add(s);
    }
    g.add(canopy);
    scene.add(g);

    swayingTrees.push({ obj: canopy, phase: Math.random() * 6.28, amp: 0.025 });
    colliders.push({
      minX: tx - 0.42 * scale,
      maxX: tx + 0.42 * scale,
      minZ: tz - 0.42 * scale,
      maxZ: tz + 0.42 * scale
    });
    trees.push({ x: tx, z: tz, radius: 1.8 * scale });
  };

  const addCoconutPalm = (tx: number, tz: number, scaleY = 1) => {
    const g = new THREE.Group();
    g.position.set(tx, 0, tz);
    const trunk = new THREE.Mesh(palmTrunkGeo, trunkMat);
    trunk.scale.y = scaleY;
    trunk.position.y = 3.1 * scaleY;
    trunk.rotation.z = 0.05;
    trunk.castShadow = true;
    g.add(trunk);

    const crown = new THREE.Group();
    crown.position.set(-0.3 * scaleY, 6.2 * scaleY, 0);
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const frond = new THREE.Mesh(frondGeo, i % 2 === 0 ? leafMid : leafBright);
      frond.position.set(Math.cos(angle) * 0.95, -0.1, Math.sin(angle) * 0.95);
      frond.rotation.y = -angle;
      frond.rotation.z = -0.35;
      crown.add(frond);
    }
    g.add(crown);
    scene.add(g);

    swayingTrees.push({ obj: crown, phase: Math.random() * 6.28, amp: 0.048 });
    colliders.push({ minX: tx - 0.34, maxX: tx + 0.34, minZ: tz - 0.34, maxZ: tz + 0.34 });
    trees.push({ x: tx, z: tz, radius: 1.5 });
  };

  const addBananaPlant = (bx: number, bz: number) => {
    const g = new THREE.Group();
    g.position.set(bx, 0, bz);
    const stem = new THREE.Mesh(bananaStemGeo, bananaStemMat);
    stem.position.y = 0.9;
    g.add(stem);
    const leaves = new THREE.Group();
    leaves.position.y = 1.75;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      const leaf = new THREE.Mesh(bananaLeafGeo, leafBright);
      leaf.position.set(Math.cos(a) * 0.6, 0.1, Math.sin(a) * 0.6);
      leaf.rotation.y = -a;
      leaf.rotation.z = -0.3;
      leaves.add(leaf);
    }
    g.add(leaves);
    scene.add(g);
    swayingTrees.push({ obj: leaves, phase: Math.random() * 6.28, amp: 0.055 });
  };

  // Grand shade Banyan/Mango Tree in SW Courtyard (বটতলা চত্বর)
  addMangoTree(-8.4, 12.6, 1.55);

  // Neighborhood Mango Trees (all cleanly off roads & buildings!)
  const mangoCoords: [number, number, number][] = [
    [-3.8, -11.5, 1.15],
    [4.4, -12.0, 1.05],
    [-21.2, 17.5, 1.1],
    [10.5, 17.5, 1.05],
    [-31.2, -15.8, 1.15],
    [-43.5, 6.8, 1.2],
    [43.8, -6.5, 1.15],
    [43.8, 19.0, 1.1],
    [-21.5, -27.0, 1.15],
    [3.8, -28.0, 1.0],
    [-21.5, 31.5, 1.1],
    [21.5, 31.5, 1.1],
    [4.2, 30.8, 0.95],
    // Expanded regions
    [-48.5, -12.0, 1.1],
    [-48.5, 16.5, 1.1],
    [48.5, -6.5, 1.1],
    [48.5, 16.5, 1.1],
    [-71.5, 6.8, 1.15],
    [71.5, 6.8, 1.15],
    [-48.5, -34.0, 1.1],
    [48.5, -34.0, 1.1],
    [-48.5, 31.5, 1.1],
    [48.5, 31.5, 1.1],
    [-5.5, -53.0, 1.15],
    [5.5, 53.0, 1.15]
  ];
  for (const [x, z, sc] of mangoCoords) addMangoTree(x, z, sc);

  // Coconut / Betel Palms
  const palmCoords: [number, number, number][] = [
    [-15.2, -4.5, 1.05],
    [18.0, -10.5, 1.1],
    [-3.8, 17.5, 0.98],
    [30.5, -15.5, 1.12],
    [-31.0, 18.5, 1.08],
    [-5.0, -35.5, 1.15],
    [21.0, -34.5, 1.05],
    [-31.0, -35.5, 1.1],
    [31.0, 19.2, 1.05],
    [30.5, 31.5, 1.12],
    // Expanded regions
    [-48.0, -6.5, 1.08],
    [48.0, -6.5, 1.08],
    [-68.0, -16.5, 1.1],
    [68.0, -16.5, 1.1],
    [-72.0, 28.5, 1.1],
    [72.0, 28.5, 1.1],
    [-22.0, -53.5, 1.12],
    [22.0, -53.5, 1.12],
    [-22.0, 53.5, 1.12],
    [22.0, 53.5, 1.12],
    // East Riverside Promenade & Boundary Palms
    [76.5, -50.0, 1.15],
    [76.5, -28.0, 1.18],
    [76.5, 14.0, 1.15],
    [76.5, 48.0, 1.2],
    [104.2, -20.0, 1.15],
    [104.2, 20.0, 1.15]
  ];
  for (const [x, z, sy] of palmCoords) addCoconutPalm(x, z, sy);

  // Banana Plants
  const bananaCoords: [number, number][] = [
    [-4.8, -7.8],
    [13.0, -4.5],
    [-15.2, -8.5],
    [29.8, -7.8],
    [-31.2, 7.2],
    [-15.5, 16.5],
    [11.5, 16.5],
    [-19.5, -34.0],
    // Expanded regions
    [-30.5, -5.0],
    [39.5, 6.5],
    [-72.0, 7.5],
    [72.0, 7.5],
    [-48.5, -28.0],
    [48.5, -28.0]
  ];
  for (const [x, z] of bananaCoords) addBananaPlant(x, z);

  // =========================================================================
  // 7. PLAYER-FOLLOWING OPTIMIZED RAIN PARTICLE SYSTEM
  // =========================================================================
  const rainCount = 650;
  const rainPositions = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    const rx = (Math.random() - 0.5) * 46;
    const ry = Math.random() * 19;
    const rz = (Math.random() - 0.5) * 46;
    rainPositions[i * 6] = rx;
    rainPositions[i * 6 + 1] = ry;
    rainPositions[i * 6 + 2] = rz;
    rainPositions[i * 6 + 3] = rx - 0.1;
    rainPositions[i * 6 + 4] = ry - 0.6;
    rainPositions[i * 6 + 5] = rz;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xcbd5e1,
    transparent: true,
    opacity: 0
  });
  const rainSystem = new THREE.LineSegments(rainGeo, rainMat);
  rainSystem.visible = false;
  rainSystem.frustumCulled = false;
  scene.add(rainSystem);

  return {
    bounds,
    messRoomBounds,
    namedZones,
    colliders,
    interactables,
    roads,
    buildings,
    trees,
    ceilingFanRotor,
    emergencyFanRotor,
    emergencyFanLed,
    roomLight,
    roomTubeMat,
    candleFlame,
    candleLight,
    coilEmberMat,
    coilSmokeGroup,
    phoneScreenMat,
    powerBankLedMat,
    tongLights,
    tongBulbMats,
    tongKupiLights,
    kettleSteamGroups,
    streetLights,
    streetBulbMats,
    houseWindowMat,
    wettableMaterials,
    mosquitoGroup,
    swayingTrees,
    rainSystem,
    rainMat,
    stars,
    sunLight,
    hemiLight,
    ambientLight
  };
}
