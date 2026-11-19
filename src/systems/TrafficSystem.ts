import * as THREE from 'three';
import { BoxCollider, VehicleEntity, VehicleType, WorldBounds } from '../types';
import { getSurfaceHeight } from '../world/WorldPhysics';
import { buildAuthenticRickshaw } from './RickshawBuilder';

export interface TrafficRoutePoint {
  x: number;
  z: number;
  speedLimit: number;
  isBridge?: boolean;
}

export class TrafficSystem {
  public readonly vehicles: VehicleEntity[] = [];
  private readonly scene: THREE.Scene;

  // Closed-loop road circuit traversing Main Road, Concrete Bridge, Riverside Promenade, South Culvert,
  // South Commercial Avenue, West Mess Avenue, North Park, and North Steel Truss Bridge!
  private readonly waypoints: TrafficRoutePoint[] = [
    // 1. Main Bazar Road heading East (Left-hand lane z = 3.6)
    { x: -90, z: 3.6, speedLimit: 6.2 },
    { x: -70, z: 3.6, speedLimit: 6.2 },
    { x: -45, z: 3.6, speedLimit: 5.8 },
    { x: -20, z: 3.6, speedLimit: 5.5 },
    { x: 5, z: 3.6, speedLimit: 5.2 },
    { x: 30, z: 3.6, speedLimit: 5.0 },
    { x: 44, z: 3.6, speedLimit: 4.5 },

    // 2. Main Concrete Bridge crossing (x = 45 to 81, apex at x = 63, z = 3.6)
    { x: 52, z: 3.6, speedLimit: 4.2, isBridge: true },
    { x: 63, z: 3.6, speedLimit: 4.2, isBridge: true }, // Concrete Bridge Apex
    { x: 74, z: 3.6, speedLimit: 4.2, isBridge: true },

    // 3. East Riverside District: Turn South onto Riverside Promenade (x = 81.5)
    { x: 81.5, z: 5.0, speedLimit: 3.8 },
    { x: 81.5, z: 16.0, speedLimit: 4.8 },
    { x: 81.5, z: 28.0, speedLimit: 4.8 },
    { x: 81.5, z: 37.0, speedLimit: 4.0 },

    // 4. South Culvert Road: Turn West across South Culvert Bridge (z = 39.2)
    { x: 78.0, z: 39.2, speedLimit: 4.0 },
    { x: 63.0, z: 39.2, speedLimit: 4.2, isBridge: true }, // Culvert Bridge
    { x: 48.0, z: 39.2, speedLimit: 4.2 },

    // 5. South Commercial Avenue & Rickshaw Stand heading West (z = 39.2)
    { x: 25.0, z: 39.2, speedLimit: 5.2 },
    { x: 0.0, z: 39.2, speedLimit: 5.5 },
    { x: -35.0, z: 39.2, speedLimit: 5.5 },
    { x: -70.0, z: 39.2, speedLimit: 5.2 },
    { x: -95.0, z: 39.2, speedLimit: 4.2 },

    // 6. Far West Avenue heading North (x = -95.0)
    { x: -95.0, z: 20.0, speedLimit: 5.2 },
    { x: -95.0, z: 2.0, speedLimit: 5.2 },
    { x: -95.0, z: -25.0, speedLimit: 5.2 },
    { x: -95.0, z: -55.0, speedLimit: 5.2 },
    { x: -95.0, z: -68.0, speedLimit: 4.2 },

    // 7. North Riverfront Highway heading East towards Steel Truss Bridge (z = -68.0)
    { x: -70.0, z: -68.0, speedLimit: 5.8 },
    { x: -35.0, z: -68.0, speedLimit: 5.8 },
    { x: 0.0, z: -68.0, speedLimit: 5.8 },
    { x: 30.0, z: -68.0, speedLimit: 5.2 },
    { x: 44.0, z: -68.0, speedLimit: 4.5 },

    // 8. North Steel Truss Bridge crossing East (x = 45 to 81, z = -68.0)
    { x: 52.0, z: -68.0, speedLimit: 4.2, isBridge: true },
    { x: 63.0, z: -68.0, speedLimit: 4.2, isBridge: true }, // Truss Bridge Apex
    { x: 74.0, z: -68.0, speedLimit: 4.2, isBridge: true },

    // 9. North-East Agro Promenade heading South to complete loop (x = 81.5)
    { x: 81.5, z: -64.0, speedLimit: 4.0 },
    { x: 81.5, z: -45.0, speedLimit: 4.8 },
    { x: 81.5, z: -20.0, speedLimit: 4.8 },
    { x: 81.5, z: -2.0, speedLimit: 4.0 }
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.spawnVehicles();
  }

  /**
   * Spawns 8 authentic Bangladeshi vehicles spaced out evenly along the circuit.
   * Includes 3 unique traditional cycle rickshaws with UNESCO rickshaw art.
   */
  private spawnVehicles(): void {
    const specs: { type: VehicleType; startWp: number; rickshawVariant?: 'tiger' | 'peacock' | 'village' }[] = [
      { type: 'rickshaw', startWp: 1, rickshawVariant: 'tiger' },     // Green/Gold Rickshaw with Bengal Tiger
      { type: 'cng', startWp: 5 },                                     // Green Auto-Rickshaw
      { type: 'car', startWp: 9 },                                     // Private Sedan
      { type: 'rickshaw', startWp: 14, rickshawVariant: 'peacock' },   // Crimson/Blue Rickshaw with Peacock
      { type: 'truck', startWp: 18 },                                  // Utility Delivery Pickup
      { type: 'cng', startWp: 23 },                                    // 2nd CNG Auto-Rickshaw
      { type: 'motorcycle', startWp: 28 },                             // Agile Motorcycle
      { type: 'rickshaw', startWp: 33, rickshawVariant: 'village' }    // Blue/Orange Rickshaw with Country Boat
    ];

    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const wp = this.waypoints[s.startWp];
      const nextWp = this.waypoints[(s.startWp + 1) % this.waypoints.length];
      const initialYaw = Math.atan2(nextWp.x - wp.x, nextWp.z - wp.z);

      const v = this.createVehicleModel(s.type, `veh_${i}_${s.type}`, s.rickshawVariant);
      v.position.set(wp.x, getSurfaceHeight(wp.x, wp.z), wp.z);
      v.yaw = initialYaw;
      v.mesh.position.copy(v.position);
      v.mesh.rotation.y = initialYaw;
      v.currentWaypoint = s.startWp;
      v.speed = wp.speedLimit * 0.75;

      this.scene.add(v.mesh);
      this.vehicles.push(v);
    }
  }

  /**
   * Builds authentic 3D vehicle models.
   */
  private createVehicleModel(
    type: VehicleType,
    id: string,
    rickshawArt: 'tiger' | 'peacock' | 'village' = 'tiger'
  ): VehicleEntity {
    // 1. TRADITIONAL BANGLADESHI CYCLE RICKSHAW
    if (type === 'rickshaw') {
      let frameColor = 0x059669; // Emerald green
      let hoodColor = 0xf59e0b;  // Gold yellow
      let hoodFrillColor = 0xdc2626; // Red frill
      let seatColor = 0xdc2626;  // Red cushion
      let lungiColor = 0x1e3a8a; // Navy check
      let vestColor = 0xffffff;  // White singlet
      let gamchaColor = 0xdc2626;// Red gamcha

      if (rickshawArt === 'peacock') {
        frameColor = 0xdc2626; // Crimson frame
        hoodColor = 0x2563eb;  // Royal blue hood
        hoodFrillColor = 0xfbbf24; // Yellow frill
        seatColor = 0x047857;  // Forest green cushion
        lungiColor = 0x047857; // Green lungi
        vestColor = 0xf1f5f9;  // Light vest
        gamchaColor = 0xf59e0b;// Saffron gamcha
      } else if (rickshawArt === 'village') {
        frameColor = 0x0284c7; // Peacock blue frame
        hoodColor = 0xf97316;  // Orange hood
        hoodFrillColor = 0x16a34a; // Green frill
        seatColor = 0x7c2d12;  // Brown leather cushion
        lungiColor = 0x7c3aed; // Purple lungi
        vestColor = 0x38bdf8;  // Sky blue vest
        gamchaColor = 0xef4444;// Red gamcha
      }

      const res = buildAuthenticRickshaw({
        id,
        frameColor,
        hoodColor,
        hoodFrillColor,
        seatColor,
        artVariant: rickshawArt,
        lungiColor,
        vestColor,
        gamchaColor
      });

      return {
        id,
        type: 'rickshaw',
        mesh: res.root,
        position: new THREE.Vector3(),
        yaw: 0,
        speed: 2.8,
        targetSpeed: 3.2,
        length: res.length,
        width: res.width,
        wheels: res.wheels,
        headlights: [],
        headlightMats: [],
        currentWaypoint: 0,
        honkCooldown: 0,
        pedalCrank: res.pedalCrank,
        pullerLeftLeg: res.pullerLeftLeg,
        pullerRightLeg: res.pullerRightLeg,
        pedalAngle: 0,
        steeringFork: res.steeringFork
      };
    }

    const root = new THREE.Group();
    const wheels: THREE.Mesh[] = [];
    const headlights: THREE.Light[] = [];
    const headlightMats: THREE.MeshStandardMaterial[] = [];

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.2
    });
    const headlightEmissive = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff3c4,
      emissiveIntensity: 0
    });
    const taillightEmissive = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.6
    });

    let length = 4.0;
    let width = 1.8;
    let targetSpeed = 6.0;

    const makeWheel = (r: number, w: number): THREE.Mesh => {
      const g = new THREE.CylinderGeometry(r, r, w, 14);
      g.rotateZ(Math.PI / 2);
      const m = new THREE.Mesh(g, tireMat);
      m.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, w * 1.02, 10), rimMat);
      rim.rotateZ(Math.PI / 2);
      m.add(rim);
      wheels.push(m);
      return m;
    };

    if (type === 'cng') {
      length = 2.9;
      width = 1.4;
      targetSpeed = 4.6;

      const cngGreenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, metalness: 0.3, roughness: 0.5 });
      const cngHoodMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const cngSeatMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.95, 2.3), cngGreenMat);
      cabin.position.y = 0.85;
      cabin.castShadow = true;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.45, 1.8), cngHoodMat);
      roof.position.set(0, 1.38, -0.2);
      roof.castShadow = true;

      const winFront = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.42, 0.05), glassMat);
      winFront.position.set(0, 1.25, 0.9);
      winFront.rotation.x = -0.25;

      const cngSeat = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.3, 0.55), cngSeatMat);
      cngSeat.position.set(0, 0.68, -0.45);

      const grillMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, wireframe: true });
      const grillL = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.55), grillMat);
      grillL.position.set(-0.65, 1.15, 0.0);
      grillL.rotation.y = Math.PI / 2;
      const grillR = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.55), grillMat);
      grillR.position.set(0.65, 1.15, 0.0);
      grillR.rotation.y = -Math.PI / 2;

      root.add(cabin, roof, winFront, cngSeat, grillL, grillR);

      // CNG Driver
      const cngDriver = new THREE.Group();
      cngDriver.position.set(0, 0.92, 0.35);
      const dTorso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.2), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
      const dHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.2), new THREE.MeshStandardMaterial({ color: 0xc48652 }));
      dHead.position.y = 0.32;
      cngDriver.add(dTorso, dHead);
      root.add(cngDriver);

      // 3 wheels (1 front, 2 rear)
      const wFront = makeWheel(0.32, 0.12);
      wFront.position.set(0, 0.32, 1.05);
      const wRearL = makeWheel(0.32, 0.12);
      wRearL.position.set(-0.55, 0.32, -0.65);
      const wRearR = makeWheel(0.32, 0.12);
      wRearR.position.set(0.55, 0.32, -0.65);
      root.add(wFront, wRearL, wRearR);

      // Headlight
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), headlightEmissive);
      hl.position.set(0, 0.72, 1.18);
      root.add(hl);
      headlightMats.push(headlightEmissive);
    } else if (type === 'car') {
      length = 4.2;
      width = 1.75;
      targetSpeed = 6.2;

      const carMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 });
      const lower = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.55, 4.0), carMat);
      lower.position.y = 0.52;
      lower.castShadow = true;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.48, 2.2), carMat);
      upper.position.set(0, 0.96, -0.2);
      upper.castShadow = true;

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.42, 0.05), glassMat);
      windshield.position.set(0, 0.92, 0.95);
      windshield.rotation.x = -0.45;
      const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.42, 0.05), glassMat);
      rearGlass.position.set(0, 0.92, -1.35);
      rearGlass.rotation.x = 0.45;

      root.add(lower, upper, windshield, rearGlass);

      // 4 wheels
      const r = 0.34;
      const wFL = makeWheel(r, 0.16); wFL.position.set(-0.84, r, 1.25);
      const wFR = makeWheel(r, 0.16); wFR.position.set(0.84, r, 1.25);
      const wRL = makeWheel(r, 0.16); wRL.position.set(-0.84, r, -1.25);
      const wRR = makeWheel(r, 0.16); wRR.position.set(0.84, r, -1.25);
      root.add(wFL, wFR, wRL, wRR);

      // Dual headlights
      for (const lx of [-0.62, 0.62]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.06), headlightEmissive);
        hl.position.set(lx, 0.58, 2.02);
        root.add(hl);
      }
      headlightMats.push(headlightEmissive);
    } else if (type === 'truck') {
      length = 5.2;
      width = 2.0;
      targetSpeed = 5.0;

      const cabMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.5, roughness: 0.4 });
      const bedMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.6 });

      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.35, 1.6), cabMat);
      cab.position.set(0, 1.15, 1.55);
      cab.castShadow = true;
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.85, 3.2), bedMat);
      bed.position.set(0, 0.9, -0.85);
      bed.castShadow = true;

      const winFront = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.55, 0.05), glassMat);
      winFront.position.set(0, 1.38, 2.36);

      root.add(cab, bed, winFront);

      const r = 0.42;
      const wFL = makeWheel(r, 0.2); wFL.position.set(-0.95, r, 1.55);
      const wFR = makeWheel(r, 0.2); wFR.position.set(0.95, r, 1.55);
      const wRL1 = makeWheel(r, 0.2); wRL1.position.set(-0.95, r, -1.2);
      const wRR1 = makeWheel(r, 0.2); wRR1.position.set(0.95, r, -1.2);
      root.add(wFL, wFR, wRL1, wRR1);

      for (const lx of [-0.68, 0.68]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.06), headlightEmissive);
        hl.position.set(lx, 0.85, 2.37);
        root.add(hl);
      }
      headlightMats.push(headlightEmissive);
    } else {
      // Motorcycle
      length = 2.1;
      width = 0.8;
      targetSpeed = 6.8;

      const bikeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.7, roughness: 0.3 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 1.2), bikeMat);
      body.position.y = 0.55;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.6), tireMat);
      seat.position.set(0, 0.72, -0.15);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.05), rimMat);
      handle.position.set(0, 0.95, 0.45);
      root.add(body, seat, handle);

      const r = 0.32;
      const wF = makeWheel(r, 0.08); wF.position.set(0, r, 0.75);
      const wR = makeWheel(r, 0.08); wR.position.set(0, r, -0.65);
      root.add(wF, wR);

      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), headlightEmissive);
      hl.position.set(0, 0.82, 0.62);
      root.add(hl);
      headlightMats.push(headlightEmissive);
    }

    return {
      id,
      type,
      mesh: root,
      position: new THREE.Vector3(),
      yaw: 0,
      speed: 4.5,
      targetSpeed,
      length,
      width,
      wheels,
      headlights,
      headlightMats,
      currentWaypoint: 0,
      honkCooldown: 0
    };
  }

  /**
   * Updates vehicle movement, waypoint steering, wheel spin, pedals, and collision avoidance.
   */
  public update(
    dt: number,
    params: {
      playerPos: THREE.Vector3;
      isNight: boolean;
      isRaining: boolean;
      onHonk?: (pitch: number) => void;
    }
  ): void {
    const { playerPos, isNight, isRaining, onHonk } = params;
    const numVehicles = this.vehicles.length;

    for (let i = 0; i < numVehicles; i++) {
      const v = this.vehicles[i];
      if (v.honkCooldown > 0) v.honkCooldown -= dt;

      // Desired next waypoint
      const currentWp = this.waypoints[v.currentWaypoint];
      const nextIndex = (v.currentWaypoint + 1) % this.waypoints.length;
      const targetWp = this.waypoints[nextIndex];

      const dx = targetWp.x - v.position.x;
      const dz = targetWp.z - v.position.z;
      const distToWp = Math.hypot(dx, dz);

      if (distToWp < 2.5) {
        v.currentWaypoint = nextIndex;
      }

      // Desired steering heading
      const desiredYaw = Math.atan2(dx, dz);
      let diff = desiredYaw - v.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      v.yaw += diff * Math.min(1, dt * 4.8);

      // Check distance to vehicle in front along circuit
      let clearAheadDist = 999;
      for (let j = 0; j < numVehicles; j++) {
        if (i === j) continue;
        const other = this.vehicles[j];
        const odx = other.position.x - v.position.x;
        const odz = other.position.z - v.position.z;
        const fwdDot = Math.sin(v.yaw) * odx + Math.cos(v.yaw) * odz;
        if (fwdDot > 0 && fwdDot < 15.0) {
          const crossDist = Math.abs(-Math.cos(v.yaw) * odx + Math.sin(v.yaw) * odz);
          if (crossDist < 2.0) {
            clearAheadDist = Math.min(clearAheadDist, fwdDot);
          }
        }
      }

      // Collision avoidance with player
      const pdx = playerPos.x - v.position.x;
      const pdz = playerPos.z - v.position.z;
      const pDot = Math.sin(v.yaw) * pdx + Math.cos(v.yaw) * pdz;
      if (pDot > 0 && pDot < 9.5) {
        const pCross = Math.abs(-Math.cos(v.yaw) * pdx + Math.sin(v.yaw) * pdz);
        if (pCross < 2.0) {
          clearAheadDist = Math.min(clearAheadDist, pDot);
          // Polite honk when player is directly in vehicle's path!
          if (v.honkCooldown <= 0) {
            v.honkCooldown = 3.5;
            onHonk?.(v.type === 'truck' ? 240 : v.type === 'cng' ? 520 : v.type === 'rickshaw' ? 1200 : 440);
          }
        }
      }

      // Speed regulation
      let desiredSpeed = targetWp.speedLimit;
      if (v.type === 'rickshaw') desiredSpeed = Math.min(desiredSpeed, 3.2);
      if (isRaining) desiredSpeed *= 0.82;

      if (clearAheadDist < 4.2) {
        desiredSpeed = 0; // Stop completely to avoid hitting obstacle or vehicle
      } else if (clearAheadDist < 8.5) {
        desiredSpeed *= 0.35; // Slow down smoothly
      }

      const accel = desiredSpeed > v.speed ? 2.8 : 5.8;
      v.speed = THREE.MathUtils.lerp(v.speed, desiredSpeed, Math.min(1, dt * accel));

      // Move forward
      v.position.x += Math.sin(v.yaw) * v.speed * dt;
      v.position.z += Math.cos(v.yaw) * v.speed * dt;

      // Surface height calculation from WorldPhysics authority (DRIVES ON TOP OF EVERY BRIDGE!)
      v.position.y = getSurfaceHeight(v.position.x, v.position.z);

      // Pitch angle calculated from surface gradient ahead and behind
      const sampleDist = 1.4;
      const aheadY = getSurfaceHeight(
        v.position.x + Math.sin(v.yaw) * sampleDist,
        v.position.z + Math.cos(v.yaw) * sampleDist
      );
      const behindY = getSurfaceHeight(
        v.position.x - Math.sin(v.yaw) * sampleDist,
        v.position.z - Math.cos(v.yaw) * sampleDist
      );
      const pitch = -Math.atan2(aheadY - behindY, sampleDist * 2);

      v.mesh.position.copy(v.position);
      v.mesh.rotation.y = v.yaw;
      v.mesh.rotation.x = pitch;

      // Wheel rotation
      const wheelR = v.type === 'truck' ? 0.42 : v.type === 'car' ? 0.34 : 0.38;
      const dRot = (v.speed * dt) / wheelR;
      for (let wIdx = 0; wIdx < v.wheels.length; wIdx++) {
        v.wheels[wIdx].rotation.x += dRot;
      }

      // Rickshaw front fork steering animation (handlebars & front wheel smoothly turn into corners)
      if (v.steeringFork) {
        const targetSteer = THREE.MathUtils.clamp(diff * 0.75, -0.42, 0.42);
        v.steeringFork.rotation.y = THREE.MathUtils.lerp(v.steeringFork.rotation.y, targetSteer, Math.min(1, dt * 6.0));
      }

      // Rickshaw pedals & animated puller legs
      if (v.pedalCrank) {
        v.pedalAngle = (v.pedalAngle || 0) + dRot * 1.15;
        v.pedalCrank.rotation.x = v.pedalAngle;
        if (v.pullerLeftLeg) {
          v.pullerLeftLeg.rotation.x = Math.sin(v.pedalAngle) * 0.42;
        }
        if (v.pullerRightLeg) {
          v.pullerRightLeg.rotation.x = -Math.sin(v.pedalAngle) * 0.42;
        }
      }

      // Automatic headlights at dusk, night, or heavy rain
      const lightsOn = isNight || isRaining;
      const targetEmissive = lightsOn ? 1.6 : 0;
      for (let mIdx = 0; mIdx < v.headlightMats.length; mIdx++) {
        v.headlightMats[mIdx].emissiveIntensity = targetEmissive;
      }
    }
  }

  public dispose(): void {
    for (const v of this.vehicles) {
      this.scene.remove(v.mesh);
    }
    this.vehicles.length = 0;
  }
}
