import * as THREE from 'three';

export interface RickshawConfig {
  id: string;
  frameColor: number;
  hoodColor: number;
  hoodFrillColor: number;
  seatColor: number;
  artVariant: 'tiger' | 'peacock' | 'village';
  lungiColor?: number;
  vestColor?: number;
  gamchaColor?: number;
  hasPuller?: boolean;
}

/**
 * Procedural authentic Bangladeshi Rickshaw Art Texture Generator (UNESCO Cultural Heritage)
 */
export function createRickshawArtTexture(variant: 'tiger' | 'peacock' | 'village'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 180;
  const ctx = canvas.getContext('2d')!;

  // 1. Rich vibrant glossy base
  const grad = ctx.createLinearGradient(0, 0, 0, 180);
  if (variant === 'tiger') {
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(1, '#0369a1');
  } else if (variant === 'peacock') {
    grad.addColorStop(0, '#047857');
    grad.addColorStop(1, '#064e3b');
  } else {
    grad.addColorStop(0, '#d97706');
    grad.addColorStop(1, '#b45309');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 180);

  // 2. Ornate scalloped golden floral border
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 168);

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 236, 160);

  // Decorative border dots
  ctx.fillStyle = '#ffffff';
  for (let x = 16; x < 240; x += 14) {
    ctx.beginPath();
    ctx.arc(x, 10, 2.5, 0, Math.PI * 2);
    ctx.arc(x, 170, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = 16; y < 170; y += 14) {
    ctx.beginPath();
    ctx.arc(10, y, 2.5, 0, Math.PI * 2);
    ctx.arc(246, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Central Artwork Motif
  if (variant === 'tiger') {
    // Royal Bengal Tiger
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(128, 92, 42, 0, Math.PI * 2);
    ctx.fill();

    // Tiger ears
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(98, 62, 14, 0, Math.PI * 2);
    ctx.arc(158, 62, 14, 0, Math.PI * 2);
    ctx.fill();

    // Tiger white snout & cheeks
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(128, 104, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiger black stripes
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    // Forehead stripes
    ctx.moveTo(128, 62); ctx.lineTo(124, 82); ctx.lineTo(132, 82); ctx.closePath();
    ctx.moveTo(114, 68); ctx.lineTo(120, 80); ctx.lineTo(112, 82); ctx.closePath();
    ctx.moveTo(142, 68); ctx.lineTo(136, 80); ctx.lineTo(144, 82); ctx.closePath();
    // Cheek stripes
    ctx.moveTo(96, 92); ctx.lineTo(110, 94); ctx.lineTo(98, 100); ctx.closePath();
    ctx.moveTo(160, 92); ctx.lineTo(146, 94); ctx.lineTo(158, 100); ctx.closePath();
    ctx.fill();

    // Nose & eyes
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(124, 98); ctx.lineTo(132, 98); ctx.lineTo(128, 104); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(114, 88, 5, 0, Math.PI * 2);
    ctx.arc(142, 88, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(114, 88, 2.5, 0, Math.PI * 2);
    ctx.arc(142, 88, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Water lilies around
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(64, 125, 12, 0, Math.PI * 2);
    ctx.arc(192, 125, 12, 0, Math.PI * 2);
    ctx.fill();
  } else if (variant === 'peacock') {
    // Colorful Peacock fan
    ctx.fillStyle = '#10b981';
    for (let a = -Math.PI * 0.8; a <= -Math.PI * 0.2; a += 0.22) {
      const fx = 128 + Math.cos(a) * 58;
      const fy = 110 + Math.sin(a) * 52;
      ctx.beginPath();
      ctx.arc(fx, fy, 12, 0, Math.PI * 2);
      ctx.fill();
      // Eye spot
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(fx, fy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10b981';
    }

    // Peacock body
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(128, 106, 16, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck and head
    ctx.beginPath();
    ctx.arc(128, 72, 9, 0, Math.PI * 2);
    ctx.fill();
    // Beak
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(135, 72); ctx.lineTo(144, 75); ctx.lineTo(135, 78); ctx.closePath();
    ctx.fill();
  } else {
    // River & Country Sailing Boat (নদীমাতৃক বাংলাদেশ)
    // River water
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(16, 100, 224, 55);

    // River wave ripples
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.5;
    for (let y = 112; y <= 145; y += 11) {
      ctx.beginPath();
      ctx.moveTo(24, y);
      ctx.bezierCurveTo(70, y - 4, 110, y + 4, 160, y);
      ctx.bezierCurveTo(190, y - 3, 220, y + 3, 236, y);
      ctx.stroke();
    }

    // Setting Golden Sun
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(128, 70, 22, 0, Math.PI * 2);
    ctx.fill();

    // Country Boat hull
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.moveTo(88, 112);
    ctx.quadraticCurveTo(128, 125, 172, 112);
    ctx.lineTo(166, 106);
    ctx.quadraticCurveTo(128, 112, 94, 106);
    ctx.closePath();
    ctx.fill();

    // Boat Sail
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(126, 108);
    ctx.lineTo(126, 68);
    ctx.quadraticCurveTo(145, 85, 126, 105);
    ctx.closePath();
    ctx.fill();
  }

  // 4. Authentic Top Banner Calligraphy: "মা বাবার দোয়া"
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 13px "Hind Siliguri", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★ মা বাবার দোয়া ★', 128, 24);

  // 5. Authentic Bottom City Tag
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "Hind Siliguri", sans-serif';
  ctx.fillText('ঢাকা মেট্রো - হ', 128, 166);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

export interface RickshawBuildResult {
  root: THREE.Group;
  wheels: THREE.Mesh[];
  steeringFork?: THREE.Group;
  pedalCrank?: THREE.Group;
  pullerLeftLeg?: THREE.Group;
  pullerRightLeg?: THREE.Group;
  length: number;
  width: number;
}

/**
 * Builds a 100% authentic, highly detailed traditional Bangladeshi Cycle Rickshaw
 * with mathematically exact wheel geometry, centered axles, and straight alignment.
 */
export function buildAuthenticRickshaw(cfg: RickshawConfig): RickshawBuildResult {
  const root = new THREE.Group();
  const wheels: THREE.Mesh[] = [];

  const length = 2.65;
  const width = 1.35;

  // Materials
  const frameMat = new THREE.MeshStandardMaterial({ color: cfg.frameColor, metalness: 0.65, roughness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.9, roughness: 0.15 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
  const hoodMat = new THREE.MeshStandardMaterial({ color: cfg.hoodColor, roughness: 0.65 });
  const frillMat = new THREE.MeshStandardMaterial({ color: cfg.hoodFrillColor, roughness: 0.7 });
  const seatMat = new THREE.MeshStandardMaterial({ color: cfg.seatColor, roughness: 0.55 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xb47b4c, roughness: 0.8 });
  const lungiMat = new THREE.MeshStandardMaterial({ color: cfg.lungiColor ?? 0x1d4ed8, roughness: 0.85 });
  const vestMat = new THREE.MeshStandardMaterial({ color: cfg.vestColor ?? 0xffffff, roughness: 0.8 });
  const gamchaMat = new THREE.MeshStandardMaterial({ color: cfg.gamchaColor ?? 0xdc2626, roughness: 0.9 });

  // 1. Spoked Bicycle Wheel Builder (Standard 28-inch Cycle Rickshaw Wheel)
  // Outer diameter = 0.76m, Outer radius = 0.380m, touches ground at exactly Y = 0.000m
  const wheelR = 0.380;
  const tireTube = 0.024;
  const majorR = wheelR - tireTube; // 0.356m

  const makeSpokedWheel = (): THREE.Mesh => {
    const wheelGroup = new THREE.Group();

    // Rubber outer tire strictly oriented in YZ plane (axle normal along X axis)
    const tireGeo = new THREE.TorusGeometry(majorR, tireTube, 12, 28);
    tireGeo.rotateY(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Chrome rim strictly oriented in YZ plane
    const rimRadius = majorR * 0.90; // 0.3204m
    const rimGeo = new THREE.TorusGeometry(rimRadius, tireTube * 0.40, 8, 24);
    rimGeo.rotateY(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, chromeMat);
    wheelGroup.add(rim);

    // Central chrome axle hub along X axis
    const hubGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.084, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeo, chromeMat);
    wheelGroup.add(hub);

    // 8 Spoke wire crossbars (16 radiating spokes) strictly coplanar in YZ plane
    const spokeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 });
    const spokeGeo = new THREE.CylinderGeometry(0.0035, 0.0035, rimRadius * 2, 4);
    for (let i = 0; i < 8; i++) {
      const spoke = new THREE.Mesh(spokeGeo, spokeMat);
      spoke.rotation.x = (i * Math.PI) / 8;
      wheelGroup.add(spoke);
    }

    // Wheel container centered at (0, 0, 0)
    const container = new THREE.Mesh();
    container.add(wheelGroup);
    wheels.push(container);
    return container;
  };

  // 2. Front Steering Assembly (Fork, Handlebars, Front Axle & Front Wheel)
  // Steers around vertical axis at Z = 1.15m without tilting or deformation
  const steeringFork = new THREE.Group();
  steeringFork.position.set(0, 0, 1.15);

  const frontWheel = makeSpokedWheel();
  frontWheel.position.set(0, wheelR, 0);
  steeringFork.add(frontWheel);

  // Front Axle Bolt through wheel hub
  const frontAxleGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.11, 8);
  frontAxleGeo.rotateZ(Math.PI / 2);
  const frontAxle = new THREE.Mesh(frontAxleGeo, chromeMat);
  frontAxle.position.set(0, wheelR, 0);

  const frontNutGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.014, 6);
  frontNutGeo.rotateZ(Math.PI / 2);
  const frontNutL = new THREE.Mesh(frontNutGeo, chromeMat);
  frontNutL.position.set(-0.052, wheelR, 0);
  const frontNutR = new THREE.Mesh(frontNutGeo, chromeMat);
  frontNutR.position.set(0.052, wheelR, 0);
  steeringFork.add(frontAxle, frontNutL, frontNutR);

  // Symmetrical Left & Right Fork Blades
  const forkBladeGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.44, 8);
  const forkL = new THREE.Mesh(forkBladeGeo, chromeMat);
  forkL.position.set(-0.050, wheelR + 0.19, -0.01);
  forkL.rotation.x = -0.05;
  const forkR = new THREE.Mesh(forkBladeGeo, chromeMat);
  forkR.position.set(0.050, wheelR + 0.19, -0.01);
  forkR.rotation.x = -0.05;

  // Fork Crown
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), chromeMat);
  crown.position.set(0, 0.77, -0.02);

  // Steer Column / Stem & Handlebars
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.28, 8), chromeMat);
  stem.position.set(0, 0.90, -0.06);
  stem.rotation.x = -0.25;

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.64, 8), chromeMat);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, 1.02, -0.12);

  // Rubber Grips
  const gripL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6), tireMat);
  gripL.rotation.z = Math.PI / 2;
  gripL.position.set(-0.26, 1.02, -0.12);
  const gripR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 6), tireMat);
  gripR.rotation.z = Math.PI / 2;
  gripR.position.set(0.26, 1.02, -0.12);

  // Brass cycle warning bell
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 })
  );
  bell.position.set(-0.16, 1.05, -0.12);

  // Curved Front Mudguard (centered concentric over front wheel)
  const frontMudguardGeo = new THREE.CylinderGeometry(
    wheelR * 1.07,
    wheelR * 1.07,
    0.065,
    16,
    1,
    true,
    -Math.PI * 0.15,
    Math.PI * 0.75
  );
  frontMudguardGeo.rotateZ(Math.PI / 2);
  const frontMudguard = new THREE.Mesh(frontMudguardGeo, frameMat);
  frontMudguard.position.set(0, wheelR, 0);

  steeringFork.add(forkL, forkR, crown, stem, bar, gripL, gripR, bell, frontMudguard);
  root.add(steeringFork);

  // 3. Rear Wheels & Solid Steel Rear Axle Assembly
  // Left and Right rear wheels placed symmetrically, parallel to centerline
  const rearLeft = makeSpokedWheel();
  rearLeft.position.set(-0.56, wheelR, -0.42);

  const rearRight = makeSpokedWheel();
  rearRight.position.set(0.56, wheelR, -0.42);

  root.add(rearLeft, rearRight);

  // Continuous Solid Steel Rear Axle Bar through both wheel hubs
  const rearAxleGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.18, 12);
  rearAxleGeo.rotateZ(Math.PI / 2);
  const rearAxle = new THREE.Mesh(rearAxleGeo, chromeMat);
  rearAxle.position.set(0, wheelR, -0.42);

  const rearNutGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.02, 6);
  rearNutGeo.rotateZ(Math.PI / 2);
  const rearNutL = new THREE.Mesh(rearNutGeo, chromeMat);
  rearNutL.position.set(-0.595, wheelR, -0.42);
  const rearNutR = new THREE.Mesh(rearNutGeo, chromeMat);
  rearNutR.position.set(0.595, wheelR, -0.42);

  root.add(rearAxle, rearNutL, rearNutR);

  // Concentric Rear Mudguards - 100% straight, parallel to wheels, zero tilt!
  const mudguardGeo = new THREE.CylinderGeometry(wheelR * 1.08, wheelR * 1.08, 0.09, 16, 1, true, 0, Math.PI);
  mudguardGeo.rotateZ(Math.PI / 2);

  const mudguardL = new THREE.Mesh(mudguardGeo, frameMat);
  mudguardL.position.set(-0.56, wheelR, -0.42);

  const mudguardR = new THREE.Mesh(mudguardGeo, frameMat);
  mudguardR.position.set(0.56, wheelR, -0.42);

  const strutGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6);
  const strutL = new THREE.Mesh(strutGeo, chromeMat);
  strutL.position.set(-0.51, wheelR + 0.10, -0.42);
  const strutR = new THREE.Mesh(strutGeo, chromeMat);
  strutR.position.set(0.51, wheelR + 0.10, -0.42);

  root.add(mudguardL, mudguardR, strutL, strutR);

  // 4. Diamond Bicycle Frame (Center Section)
  const headTube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.22, 8), frameMat);
  headTube.position.set(0, 0.82, 1.09);
  headTube.rotation.x = -0.25;

  const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.74, 6), frameMat);
  topTube.position.set(0, 0.82, 0.72);
  topTube.rotation.x = -0.42;

  const downTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.76, 6), frameMat);
  downTube.position.set(0, 0.58, 0.74);
  downTube.rotation.x = -0.78;

  const seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.52, 6), frameMat);
  seatTube.position.set(0, 0.62, 0.38);
  seatTube.rotation.x = 0.28;

  root.add(headTube, topTube, downTube, seatTube);

  // Driver Saddle (সিট)
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.26), tireMat);
  saddle.position.set(0, 0.86, 0.35);
  root.add(saddle);

  // 5. Revolving Pedal Crank Assembly (প্যাডেল ও ক্র্যাঙ্ক)
  const pedalCrank = new THREE.Group();
  pedalCrank.position.set(0, 0.38, 0.44);

  // Center sprocket
  const sprocket = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12), chromeMat);
  sprocket.rotation.z = Math.PI / 2;
  pedalCrank.add(sprocket);

  // Left & right crank arms (180 deg opposing)
  const crankArmL = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.16, 0.024), chromeMat);
  crankArmL.position.set(-0.11, 0.07, 0);
  const pedalL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.06), tireMat);
  pedalL.position.set(-0.11, 0.14, 0);

  const crankArmR = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.16, 0.024), chromeMat);
  crankArmR.position.set(0.11, -0.07, 0);
  const pedalR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.06), tireMat);
  pedalR.position.set(0.11, -0.14, 0);

  pedalCrank.add(crankArmL, pedalL, crankArmR, pedalR);
  root.add(pedalCrank);

  // 6. Passenger Compartment & Bodywork
  // Lower chassis frame
  const chassisL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.2), frameMat);
  chassisL.position.set(-0.46, 0.42, -0.2);
  const chassisR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.2), frameMat);
  chassisR.position.set(0.46, 0.42, -0.2);
  const crossBrace = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.04, 0.04), frameMat);
  crossBrace.position.set(0, 0.42, -0.42);
  root.add(chassisL, chassisR, crossBrace);

  // Wooden footboard with brass brackets
  const footboard = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.46), woodMat);
  footboard.position.set(0, 0.46, -0.06);
  footboard.receiveShadow = true;
  root.add(footboard);

  // Passenger Padded Bench Seat (যাত্রীর আসন)
  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.22, 0.48), frameMat);
  seatBase.position.set(0, 0.59, -0.45);
  const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.44), seatMat);
  seatCushion.position.set(0, 0.75, -0.45);
  const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.48, 0.12), seatMat);
  backrest.position.set(0, 1.02, -0.65);
  backrest.rotation.x = -0.14;

  // Armrests (হ্যান্ডরেস্ট)
  const armrestL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.38), seatMat);
  armrestL.position.set(-0.46, 0.88, -0.45);
  const armrestR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.38), seatMat);
  armrestR.position.set(0.46, 0.88, -0.45);
  root.add(seatBase, seatCushion, backrest, armrestL, armrestR);

  // 7. Traditional Folding Canopy / Hood (ছই)
  // Ribbed curved hood canopy
  const hoodArch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 0.98, 12, 1, false, 0, Math.PI),
    hoodMat
  );
  hoodArch.rotation.z = Math.PI / 2;
  hoodArch.position.set(0, 1.34, -0.48);
  hoodArch.castShadow = true;

  // Rear hood back cover
  const hoodBack = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.58, 0.08), hoodMat);
  hoodBack.position.set(0, 1.25, -0.74);

  // Scalloped decorative hood frill / trim (ঝালর)
  const frill = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.09, 0.68), frillMat);
  frill.position.set(0, 1.24, -0.42);

  // Chrome hood scissor tension stays (হুডের স্প্রিং বাতি)
  const stayL = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.54, 4), chromeMat);
  stayL.position.set(-0.51, 1.22, -0.45);
  stayL.rotation.x = 0.45;
  const stayR = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.54, 4), chromeMat);
  stayR.position.set(0.51, 1.22, -0.45);
  stayR.rotation.x = 0.45;

  root.add(hoodArch, hoodBack, frill, stayL, stayR);

  // 8. Authentic Painted Rear Art Tin Plate (রিকশার পেছনের আর্টবোর্ড)
  const artTexture = createRickshawArtTexture(cfg.artVariant);
  const artMat = new THREE.MeshStandardMaterial({
    map: artTexture,
    roughness: 0.35,
    metalness: 0.15
  });
  const rearArtPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.44), artMat);
  rearArtPlate.rotation.y = Math.PI; // Faces directly backward!
  rearArtPlate.position.set(0, 0.62, -0.71);

  // Tin plate ornamental brass border frame
  const plateBorder = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.48, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.3 })
  );
  plateBorder.position.set(0, 0.62, -0.70);
  root.add(plateBorder, rearArtPlate);

  // 9. Authentic Animated Rickshaw Puller (রিকশাওয়ালা)
  let pullerLeftLeg: THREE.Group | undefined;
  let pullerRightLeg: THREE.Group | undefined;

  if (cfg.hasPuller !== false) {
    const puller = new THREE.Group();
    puller.position.set(0, 0.86, 0.38);

    // Torso in Vest / T-Shirt
    const pullerTorso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 0.20), vestMat);
    pullerTorso.position.y = 0.26;
    pullerTorso.rotation.x = 0.18; // Leaning slightly forward into handlebars
    pullerTorso.castShadow = true;

    // Head and traditional short hair
    const pullerHead = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 0.20), skinMat);
    pullerHead.position.set(0, 0.58, 0.06);
    const hair = new THREE.Mesh(
      new THREE.BoxGeometry(0.21, 0.08, 0.21),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 })
    );
    hair.position.set(0, 0.66, 0.06);

    // Red Gamcha (গামছা) tied around shoulders & neck
    const gamcha = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.24), gamchaMat);
    gamcha.position.set(0, 0.48, 0.03);

    // Arms gripping the handlebars
    const armMat = vestMat;
    const pullerArmL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.09), armMat);
    pullerArmL.position.set(-0.20, 0.36, 0.22);
    pullerArmL.rotation.x = 0.95;
    pullerArmL.rotation.z = -0.22;

    const pullerArmR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.09), armMat);
    pullerArmR.position.set(0.20, 0.36, 0.22);
    pullerArmR.rotation.x = 0.95;
    pullerArmR.rotation.z = 0.22;

    // Articulated legs with Checkered Lungi (লুঙ্গি)
    pullerLeftLeg = new THREE.Group();
    pullerLeftLeg.position.set(-0.10, 0.06, 0);
    const thighL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.13), lungiMat);
    thighL.position.y = -0.16;
    const shinL = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.30, 0.10), skinMat);
    shinL.position.set(0, -0.38, 0.04);
    pullerLeftLeg.add(thighL, shinL);

    pullerRightLeg = new THREE.Group();
    pullerRightLeg.position.set(0.10, 0.06, 0);
    const thighR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.13), lungiMat);
    thighR.position.y = -0.16;
    const shinR = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.30, 0.10), skinMat);
    shinR.position.set(0, -0.38, 0.04);
    pullerRightLeg.add(thighR, shinR);

    puller.add(pullerTorso, pullerHead, hair, gamcha, pullerArmL, pullerArmR, pullerLeftLeg, pullerRightLeg);
    root.add(puller);
  }

  return {
    root,
    wheels,
    steeringFork,
    pedalCrank,
    pullerLeftLeg,
    pullerRightLeg,
    length,
    width
  };
}
