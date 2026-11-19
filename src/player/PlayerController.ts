import * as THREE from 'three';
import { BoxCollider, SpeedMode, WorldBounds } from '../types';
import { getSurfaceHeight } from '../world/WorldPhysics';

export interface PlayerCallbacks {
  onInteract: () => void;
  onPauseToggle: () => void;
  onMapToggle: () => void;
  onStandUp?: () => void;
  onSleepStart?: () => void;
  onWakeUp?: () => void;
}

export class PlayerController {
  public readonly mesh: THREE.Group;
  public readonly position = new THREE.Vector3(-10.0, 0.06, -2.4);
  public facingYaw = Math.PI;
  public cameraYaw = 0;
  public cameraPitch = 0.34;
  public cameraDist = 5.4;

  // Sitting & Sleeping states
  public isSitting = false;
  public isSleeping = false;
  public sitTargetId: string | null = null;
  public sitType: 'chair' | 'bed' | 'bench' | null = null;
  private preSitPosition = new THREE.Vector3(-10.0, 0.06, -2.4);

  // Movement speed mode (3 speeds: Normal Walk, Fast Walk, Sprint)
  public speedMode: SpeedMode = 'walk';
  public mobileSpeedMode: SpeedMode = 'walk';
  public currentSpeed = 0;

  public isDrinking = false;
  private drinkTimer = 0;

  private readonly keys = new Set<string>();
  private mobileMoveX = 0;
  private mobileMoveY = 0;

  // Articulated limbs for smooth procedural animation
  private bodyPivot!: THREE.Group;
  private torsoMesh!: THREE.Mesh;
  private headGroup!: THREE.Group;
  private leftArm!: THREE.Group;
  private rightArm!: THREE.Group;
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private teaCupMesh!: THREE.Mesh;

  private walkCycle = 0;
  private readonly radius = 0.34;

  // Scratch vectors to avoid per-frame allocations
  private readonly _lookTarget = new THREE.Vector3();
  private readonly _desiredCam = new THREE.Vector3();

  // Mouse & Touch camera state
  private isMouseDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private activeCameraTouchId: number | null = null;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private joystickTouchId: number | null = null;

  private readonly callbacks: PlayerCallbacks;
  private readonly canvas: HTMLCanvasElement;
  private enabled = false;
  private lastColliders: BoxCollider[] = [];
  private lastBounds: WorldBounds = { minX: -76, maxX: 76, minZ: -62, maxZ: 62 };

  constructor(
    scene: THREE.Scene,
    canvas: HTMLCanvasElement,
    callbacks: PlayerCallbacks
  ) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.mesh = this.buildCharacterMesh();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
    this.bindInputs();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearAllInputs();
    }
  }

  private clearAllInputs(): void {
    this.keys.clear();
    this.mobileMoveX = 0;
    this.mobileMoveY = 0;
    this.isMouseDragging = false;
    this.activeCameraTouchId = null;
    this.joystickTouchId = null;
    const stick = document.getElementById('joystick-stick');
    if (stick) stick.style.transform = 'translate(-50%, -50%)';
  }

  public isPositionClear(
    x: number,
    z: number,
    colliders: BoxCollider[],
    bounds: WorldBounds
  ): boolean {
    if (
      x < bounds.minX + 0.6 ||
      x > bounds.maxX - 0.6 ||
      z < bounds.minZ + 0.6 ||
      z > bounds.maxZ - 0.6
    ) {
      return false;
    }
    return !this.collides(x, z, colliders);
  }

  public setPosition(x: number, z: number, yaw?: number): void {
    const y = getSurfaceHeight(x, z) + 0.02;
    this.position.set(x, y, z);
    if (yaw !== undefined) {
      this.facingYaw = yaw;
      this.cameraYaw = yaw + Math.PI;
    }
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.facingYaw;
  }

  /**
   * Proper Furniture Sitting
   * Aligns character accurately at anchor position, sitting height, and facing direction.
   */
  public sitAt(
    pos: THREE.Vector3,
    facing: number,
    targetId: string,
    sitType: 'chair' | 'bed' | 'bench' = 'chair'
  ): void {
    if (!this.isSitting && !this.isSleeping) {
      this.preSitPosition.copy(this.position);
    }
    this.isSitting = true;
    this.isSleeping = false;
    this.sitTargetId = targetId;
    this.sitType = sitType;

    // Reset lying down rotations
    this.bodyPivot.rotation.set(0, 0, 0);
    this.position.copy(pos);
    this.facingYaw = facing;
    this.mesh.position.copy(pos);
    this.mesh.rotation.y = facing;
  }

  /**
   * Realistic Bed Sleeping
   * Body lies flat lengthwise on mattress, head resting on pillow.
   */
  public sleepOnBed(): void {
    if (!this.isSitting && !this.isSleeping) {
      this.preSitPosition.copy(this.position);
    }
    this.isSitting = false;
    this.isSleeping = true;
    this.sitTargetId = 'mess_bed';
    this.sitType = 'bed';

    // Bed mattress center in world coordinates: x = -12.35, y = 0.68, z = -11.45
    // Headboard at North (z = -12.68), pillow at z = -12.32
    this.position.set(-12.35, 0.68, -11.45);
    this.facingYaw = 0; // Lengthwise along bed: Head at -Z (North), Feet at +Z (South)
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.facingYaw;

    this.callbacks.onSleepStart?.();
  }

  /**
   * Wake Up from Sleeping
   * Smoothly rises, sits on bed edge, and stands beside the bed.
   */
  public wakeUp(): void {
    if (!this.isSleeping) return;
    this.isSleeping = false;
    this.isSitting = false;
    this.sitTargetId = null;
    this.sitType = null;

    // Reset body rotations
    this.bodyPivot.rotation.set(0, 0, 0);
    this.bodyPivot.position.set(0, 0, 0);
    this.headGroup.rotation.set(0, 0, 0);

    // Stand bedside at x = -11.1, z = -11.4 facing eastward (+X)
    this.position.set(-11.1, 0.06, -11.4);
    this.facingYaw = Math.PI / 2;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.facingYaw;

    this.callbacks.onWakeUp?.();
    this.callbacks.onStandUp?.();
  }

  /**
   * Stand Up from Chair or Bed
   */
  public standUp(): void {
    if (this.isSleeping) {
      this.wakeUp();
      return;
    }
    if (!this.isSitting) return;
    this.isSitting = false;
    this.sitTargetId = null;
    this.sitType = null;

    // Reset body rotations
    this.bodyPivot.rotation.set(0, 0, 0);
    this.bodyPivot.position.set(0, 0, 0);
    this.headGroup.rotation.set(0, 0, 0);

    // Prefer returning to pre-sit spot if clear and close; otherwise find closest clear offset
    const preDist = Math.hypot(
      this.preSitPosition.x - this.position.x,
      this.preSitPosition.z - this.position.z
    );
    if (
      preDist < 3.0 &&
      this.isPositionClear(
        this.preSitPosition.x,
        this.preSitPosition.z,
        this.lastColliders,
        this.lastBounds
      )
    ) {
      this.position.copy(this.preSitPosition);
    } else {
      const candidates: [number, number][] = [
        [Math.sin(this.facingYaw) * 0.7, Math.cos(this.facingYaw) * 0.7],
        [-Math.sin(this.facingYaw) * 0.75, -Math.cos(this.facingYaw) * 0.75],
        [Math.cos(this.facingYaw) * 0.75, -Math.sin(this.facingYaw) * 0.75],
        [-Math.cos(this.facingYaw) * 0.75, Math.sin(this.facingYaw) * 0.75]
      ];
      for (const [ox, oz] of candidates) {
        const cx = this.position.x + ox;
        const cz = this.position.z + oz;
        if (this.isPositionClear(cx, cz, this.lastColliders, this.lastBounds)) {
          this.position.set(cx, 0.06, cz);
          break;
        }
      }
    }

    this.position.y = 0.06;
    this.callbacks.onStandUp?.();
  }

  /**
   * Cycle Mobile Speed Mode (Walk -> Fast Walk -> Sprint -> Walk)
   */
  public cycleMobileSpeedMode(): SpeedMode {
    if (this.mobileSpeedMode === 'walk') {
      this.mobileSpeedMode = 'fast';
    } else if (this.mobileSpeedMode === 'fast') {
      this.mobileSpeedMode = 'sprint';
    } else {
      this.mobileSpeedMode = 'walk';
    }
    this.updateMobileSpeedUI();
    return this.mobileSpeedMode;
  }

  public setMobileSpeedMode(mode: SpeedMode): void {
    this.mobileSpeedMode = mode;
    this.updateMobileSpeedUI();
  }

  public updateMobileSpeedUI(): void {
    const btn = document.getElementById('btn-mobile-run');
    if (!btn) return;
    if (this.mobileSpeedMode === 'walk') {
      btn.innerHTML = '🚶<small>হাঁটা</small>';
      btn.classList.remove('active', 'sprint');
    } else if (this.mobileSpeedMode === 'fast') {
      btn.innerHTML = '🚶‍♂️<small>দ্রুত</small>';
      btn.classList.add('active');
      btn.classList.remove('sprint');
    } else {
      btn.innerHTML = '🏃<small>দৌড়</small>';
      btn.classList.add('active', 'sprint');
    }
  }

  public triggerDrinkAnimation(): void {
    this.isDrinking = true;
    this.drinkTimer = 1.65;
    this.teaCupMesh.visible = true;
  }

  public setHoldingTeaCup(holding: boolean): void {
    this.teaCupMesh.visible = holding || this.isDrinking;
  }

  private buildCharacterMesh(): THREE.Group {
    const root = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68652, roughness: 0.72 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.85 });
    const panjabiMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.78 });
    const collarMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x3f2b1d, roughness: 0.8 });

    this.bodyPivot = new THREE.Group();
    root.add(this.bodyPivot);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.24), panjabiMat);
    torso.position.y = 1.06;
    torso.castShadow = true;
    this.bodyPivot.add(torso);
    this.torsoMesh = torso;

    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.255), collarMat);
    collar.position.set(0, 1.24, 0);
    this.bodyPivot.add(collar);

    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.48, 0);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), skinMat);
    head.castShadow = true;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), hairMat);
    hair.position.set(0, 0.13, -0.01);
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.18, 0.08), hairMat);
    hairBack.position.set(0, 0.02, -0.13);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const lEye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), eyeMat);
    lEye.position.set(-0.06, 0.02, 0.142);
    const rEye = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), eyeMat);
    rEye.position.set(0.06, 0.02, 0.142);
    this.headGroup.add(head, hair, hairBack, lEye, rEye);
    this.bodyPivot.add(this.headGroup);

    const buildArm = (x: number, withCup = false) => {
      const armPivot = new THREE.Group();
      armPivot.position.set(x, 1.31, 0);
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.32, 0.14), panjabiMat);
      sleeve.position.y = -0.15;
      sleeve.castShadow = true;
      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.12), skinMat);
      forearm.position.y = -0.4;
      armPivot.add(sleeve, forearm);
      if (withCup) {
        const cup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.032, 0.085, 8),
          new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.3 })
        );
        cup.position.set(0, -0.54, 0.07);
        cup.visible = false;
        armPivot.add(cup);
        this.teaCupMesh = cup;
      }
      return armPivot;
    };
    this.leftArm = buildArm(-0.29, false);
    this.rightArm = buildArm(0.29, true);
    this.bodyPivot.add(this.leftArm, this.rightArm);

    const buildLeg = (x: number) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(x, 0.76, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.17), pantsMat);
      thigh.position.y = -0.33;
      thigh.castShadow = true;
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.24), shoeMat);
      shoe.position.set(0, -0.71, 0.04);
      legPivot.add(thigh, shoe);
      return legPivot;
    };
    this.leftLeg = buildLeg(-0.11);
    this.rightLeg = buildLeg(0.11);
    this.bodyPivot.add(this.leftLeg, this.rightLeg);

    return root;
  }

  private bindInputs(): void {
    window.addEventListener('blur', () => this.clearAllInputs());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.clearAllInputs();
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        this.callbacks.onPauseToggle();
        return;
      }
      if (!this.enabled) return;

      const code = e.code;
      if (code === 'KeyE') {
        if (!e.repeat) {
          if (this.isSleeping) {
            this.wakeUp();
          } else {
            this.callbacks.onInteract();
          }
        }
        return;
      }
      if (code === 'KeyM') {
        if (!e.repeat) this.callbacks.onMapToggle();
        return;
      }
      if (code === 'Space') {
        if (this.isSleeping) {
          this.wakeUp();
          return;
        }
        if (this.isSitting) {
          this.standUp();
          return;
        }
      }
      this.keys.add(code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (e.button === 0 || e.button === 2) {
        this.isMouseDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement === this.canvas) {
        this.cameraYaw -= e.movementX * 0.004;
        this.cameraPitch = THREE.MathUtils.clamp(
          this.cameraPitch + e.movementY * 0.0032,
          0.12,
          1.08
        );
        return;
      }
      if (!this.isMouseDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.cameraYaw -= dx * 0.0065;
      this.cameraPitch = THREE.MathUtils.clamp(
        this.cameraPitch + dy * 0.0045,
        0.12,
        1.08
      );
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDragging = false;
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.enabled) return;
        this.cameraDist = THREE.MathUtils.clamp(
          this.cameraDist + e.deltaY * 0.003,
          2.8,
          8.8
        );
      },
      { passive: true }
    );

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Multi-touch camera drag on canvas
    this.canvas.addEventListener(
      'touchstart',
      (e) => {
        if (!this.enabled) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (this.activeCameraTouchId === null && t.identifier !== this.joystickTouchId) {
            this.activeCameraTouchId = t.identifier;
            this.lastTouchX = t.clientX;
            this.lastTouchY = t.clientY;
            break;
          }
        }
      },
      { passive: true }
    );

    this.canvas.addEventListener(
      'touchmove',
      (e) => {
        if (!this.enabled) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.activeCameraTouchId) {
            const dx = t.clientX - this.lastTouchX;
            const dy = t.clientY - this.lastTouchY;
            this.lastTouchX = t.clientX;
            this.lastTouchY = t.clientY;
            this.cameraYaw -= dx * 0.007;
            this.cameraPitch = THREE.MathUtils.clamp(
              this.cameraPitch + dy * 0.005,
              0.12,
              1.08
            );
            break;
          }
        }
      },
      { passive: true }
    );

    const endCameraTouch = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.activeCameraTouchId) {
          this.activeCameraTouchId = null;
          break;
        }
      }
    };
    this.canvas.addEventListener('touchend', endCameraTouch);
    this.canvas.addEventListener('touchcancel', endCameraTouch);

    // Mobile Virtual Joystick Setup
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const stick = document.getElementById('joystick-stick');
    const btnRun = document.getElementById('btn-mobile-run');
    const btnInteract = document.getElementById('btn-mobile-interact');

    if (!zone || !base || !stick) return;

    const maxR = 46;
    const updateStick = (clientX: number, clientY: number) => {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > maxR) {
        dx = (dx / len) * maxR;
        dy = (dy / len) * maxR;
      }
      stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.mobileMoveX = dx / maxR;
      this.mobileMoveY = -dy / maxR;
    };

    const resetStick = () => {
      this.joystickTouchId = null;
      this.mobileMoveX = 0;
      this.mobileMoveY = 0;
      stick.style.transform = 'translate(-50%, -50%)';
    };

    zone.addEventListener(
      'touchstart',
      (e) => {
        e.stopPropagation();
        if (this.joystickTouchId === null && e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          this.joystickTouchId = t.identifier;
          updateStick(t.clientX, t.clientY);
        }
      },
      { passive: true }
    );
    zone.addEventListener(
      'touchmove',
      (e) => {
        e.stopPropagation();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.joystickTouchId) {
            updateStick(t.clientX, t.clientY);
            break;
          }
        }
      },
      { passive: true }
    );
    zone.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          resetStick();
        }
      }
    });
    zone.addEventListener('touchcancel', resetStick);

    let mouseJoy = false;
    zone.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      mouseJoy = true;
      updateStick(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', (e) => {
      if (mouseJoy) updateStick(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', () => {
      if (mouseJoy) {
        mouseJoy = false;
        resetStick();
      }
    });

    btnRun?.addEventListener('click', () => {
      this.cycleMobileSpeedMode();
    });

    btnInteract?.addEventListener('click', () => {
      if (this.enabled) {
        if (this.isSleeping) {
          this.wakeUp();
        } else {
          this.callbacks.onInteract();
        }
      }
    });
  }

  public update(
    dt: number,
    colliders: BoxCollider[],
    bounds: WorldBounds,
    camera: THREE.PerspectiveCamera,
    insideMess: boolean,
    elapsed: number
  ): boolean {
    this.lastColliders = colliders;
    this.lastBounds = bounds;
    let moved = false;

    // When sleeping: controls locked, character rests peacefully, bedside camera view
    if (this.isSleeping) {
      this.currentSpeed = 0;
      this.animateCharacter(dt, elapsed, false, false);

      // Relaxed bedside cinematic camera view
      this._lookTarget.set(-12.35, 0.95, -11.45);
      const sleepCamPos = new THREE.Vector3(-10.6, 2.1, -10.0);
      camera.position.lerp(sleepCamPos, Math.min(1, dt * 6));
      camera.lookAt(this._lookTarget);
      return false;
    }

    let inputForward = 0;
    let inputRight = 0;
    if (this.enabled) {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) inputForward += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) inputForward -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) inputRight += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) inputRight -= 1;

      if (Math.abs(this.mobileMoveX) > 0.08 || Math.abs(this.mobileMoveY) > 0.08) {
        inputRight += this.mobileMoveX;
        inputForward += this.mobileMoveY;
      }
    }

    const inputLen = Math.hypot(inputForward, inputRight);

    if (this.isSitting && inputLen > 0.35) {
      this.standUp();
    }

    // Determine target speed mode:
    // PC: Normal W/A/S/D walk, Hold CTRL for Fast Walk, Hold SHIFT for Sprint
    // Mobile: Selected via tri-state mobile speed button
    let targetSpeed = 2.6; // Normal Walk
    let isSprinting = false;
    let isFastWalking = false;

    const shiftHeld = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const ctrlHeld = this.keys.has('ControlLeft') || this.keys.has('ControlRight');

    if (shiftHeld || this.mobileSpeedMode === 'sprint') {
      targetSpeed = 6.6;
      isSprinting = true;
      this.speedMode = 'sprint';
    } else if (ctrlHeld || this.mobileSpeedMode === 'fast') {
      targetSpeed = 4.2;
      isFastWalking = true;
      this.speedMode = 'fast';
    } else {
      targetSpeed = 2.6;
      this.speedMode = 'walk';
    }

    if (!this.isSitting && inputLen > 0.05) {
      const normF = inputForward / Math.max(1, inputLen);
      const normR = inputRight / Math.max(1, inputLen);

      const fwdX = -Math.sin(this.cameraYaw);
      const fwdZ = -Math.cos(this.cameraYaw);
      const rightX = Math.cos(this.cameraYaw);
      const rightZ = -Math.sin(this.cameraYaw);

      const moveX = fwdX * normF + rightX * normR;
      const moveZ = fwdZ * normF + rightZ * normR;

      // Smooth acceleration towards target speed
      this.currentSpeed = THREE.MathUtils.lerp(
        this.currentSpeed,
        targetSpeed,
        Math.min(1, dt * 8.5)
      );

      const nextX = THREE.MathUtils.clamp(
        this.position.x + moveX * this.currentSpeed * dt,
        bounds.minX + 0.6,
        bounds.maxX - 0.6
      );
      const nextZ = THREE.MathUtils.clamp(
        this.position.z + moveZ * this.currentSpeed * dt,
        bounds.minZ + 0.6,
        bounds.maxZ - 0.6
      );

      if (!this.collides(nextX, this.position.z, colliders)) {
        this.position.x = nextX;
      }
      if (!this.collides(this.position.x, nextZ, colliders)) {
        this.position.z = nextZ;
      }

      const desiredYaw = Math.atan2(moveX, moveZ);
      let diff = desiredYaw - this.facingYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facingYaw += diff * Math.min(1, dt * 12);

      // Body banking and head-turning lerp when turning
      const turnLean = THREE.MathUtils.clamp(-diff * 0.16, -0.12, 0.12);
      this.bodyPivot.rotation.z = THREE.MathUtils.lerp(
        this.bodyPivot.rotation.z,
        turnLean,
        Math.min(1, dt * 10)
      );
      this.headGroup.rotation.y = THREE.MathUtils.lerp(
        this.headGroup.rotation.y,
        THREE.MathUtils.clamp(diff * 0.45, -0.32, 0.32),
        Math.min(1, dt * 10)
      );

      moved = true;
    } else {
      // Smooth deceleration to stop
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, 0, Math.min(1, dt * 10));
      this.bodyPivot.rotation.z = THREE.MathUtils.lerp(this.bodyPivot.rotation.z, 0, Math.min(1, dt * 8));
      this.headGroup.rotation.y = THREE.MathUtils.lerp(this.headGroup.rotation.y, 0, Math.min(1, dt * 8));
    }

    // Dynamic surface elevation tracking (Player walks firmly ON TOP of every bridge deck!)
    if (!this.isSitting && !this.isSleeping) {
      const targetY = getSurfaceHeight(this.position.x, this.position.z) + 0.02;
      this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, Math.min(1, dt * 20));
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.facingYaw;
    this.animateCharacter(dt, elapsed, isSprinting, isFastWalking);

    // Smooth third-person orbit camera with interior clamping & outdoor building clearance
    let targetDist = insideMess ? Math.min(this.cameraDist, 3.05) : this.cameraDist;
    this._lookTarget.set(
      this.position.x,
      this.position.y + (this.isSitting ? 1.05 : 1.38),
      this.position.z
    );

    const dirX = Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch);
    const dirY = Math.sin(this.cameraPitch);
    const dirZ = Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch);

    // Outdoor camera wall-avoidance check
    if (!insideMess) {
      for (let d = targetDist; d >= 2.2; d -= 0.7) {
        const sx = this._lookTarget.x + dirX * d;
        const sz = this._lookTarget.z + dirZ * d;
        const sy = this._lookTarget.y + dirY * d + 0.35;
        if (sy < 4.5 && this.pointInsideSolidBuilding(sx, sz, colliders)) {
          targetDist = Math.max(2.1, d - 0.7);
        } else {
          break;
        }
      }
    }

    let desiredCamX = this._lookTarget.x + dirX * targetDist;
    let desiredCamY = Math.max(0.78, this._lookTarget.y + dirY * targetDist + 0.35);
    let desiredCamZ = this._lookTarget.z + dirZ * targetDist;

    if (insideMess) {
      desiredCamX = THREE.MathUtils.clamp(desiredCamX, -13.45, -6.55);
      desiredCamZ = THREE.MathUtils.clamp(desiredCamZ, -12.85, -7.1);
      desiredCamY = Math.min(desiredCamY, 3.12);
    }

    this._desiredCam.set(desiredCamX, desiredCamY, desiredCamZ);
    camera.position.lerp(this._desiredCam, Math.min(1, dt * 10));
    camera.lookAt(this._lookTarget);

    return moved;
  }

  private pointInsideSolidBuilding(x: number, z: number, colliders: BoxCollider[]): boolean {
    const pad = 0.25;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.maxX - c.minX > 2.2 && c.maxZ - c.minZ > 2.2) {
        if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Procedural Character Animation with Zero Foot-Sliding
   * Limb swing rate is directly proportional to actual ground speed.
   */
  private animateCharacter(
    dt: number,
    elapsed: number,
    isSprinting: boolean,
    isFastWalking: boolean
  ): void {
    if (this.drinkTimer > 0) {
      this.drinkTimer = Math.max(0, this.drinkTimer - dt);
      if (this.drinkTimer === 0) {
        this.isDrinking = false;
      }
    }

    // 1. SLEEPING ON BED
    if (this.isSleeping) {
      // Body lies flat on the mattress along Z
      this.bodyPivot.position.set(0, -0.15 + Math.sin(elapsed * 2.2) * 0.012, 0);
      this.bodyPivot.rotation.set(-Math.PI * 0.49, 0, 0);
      this.leftLeg.rotation.set(0.04, 0, 0.04);
      this.rightLeg.rotation.set(0.04, 0, -0.04);
      this.leftArm.rotation.set(-0.25, 0, 0.35);
      this.rightArm.rotation.set(-0.25, 0, -0.35);
      this.headGroup.rotation.set(0.12, 0.08, 0);
      this.torsoMesh.rotation.x = 0;
      return;
    }

    // 2. SITTING (CHAIR / BED / BENCH)
    if (this.isSitting) {
      this.bodyPivot.rotation.set(0, 0, 0);
      this.bodyPivot.position.y = this.sitType === 'bed' ? -0.18 : -0.28;
      this.leftLeg.rotation.set(-Math.PI * 0.48, 0, 0);
      this.rightLeg.rotation.set(-Math.PI * 0.48, 0, 0);
      this.leftArm.rotation.set(-0.32, 0, 0);
      this.rightArm.rotation.set(
        this.isDrinking ? -1.45 + Math.sin(elapsed * 6) * 0.15 : -0.32,
        0,
        0
      );
      this.headGroup.rotation.set(
        this.isDrinking ? -0.15 : Math.sin(elapsed * 1.4) * 0.04,
        0,
        0
      );
      this.torsoMesh.rotation.x = 0;
      return;
    }

    // Reset body pivot rotation when standing/walking
    this.bodyPivot.rotation.x = THREE.MathUtils.lerp(this.bodyPivot.rotation.x, 0, dt * 10);

    const speedNorm = Math.min(1, this.currentSpeed / 2.6);
    if (this.currentSpeed > 0.08) {
      // Cadence strictly proportional to actual ground displacement -> ZERO foot sliding!
      const stepFreq = this.currentSpeed * 2.65;
      this.walkCycle += dt * stepFreq;

      const strideAmp = isSprinting ? 0.78 : isFastWalking ? 0.58 : 0.44;
      const armAmp = isSprinting ? 0.82 : isFastWalking ? 0.62 : 0.46;
      const swing = Math.sin(this.walkCycle) * strideAmp;

      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftLeg.rotation.z = 0;
      this.rightLeg.rotation.z = 0;

      this.leftArm.rotation.x = -swing * (armAmp / strideAmp);
      this.leftArm.rotation.z = 0;
      this.rightArm.rotation.x = this.isDrinking
        ? -1.45 + Math.sin(elapsed * 6) * 0.15
        : swing * (armAmp / strideAmp);
      this.rightArm.rotation.z = 0;

      // Athletic forward lean during fast walk / sprint
      const forwardLean = isSprinting
        ? 0.14 * (this.currentSpeed / 6.6)
        : isFastWalking
          ? 0.06
          : 0.02;
      this.torsoMesh.rotation.x = THREE.MathUtils.lerp(
        this.torsoMesh.rotation.x,
        forwardLean,
        Math.min(1, dt * 8)
      );
      this.bodyPivot.position.y = Math.abs(Math.cos(this.walkCycle)) * 0.05 * speedNorm;
      this.headGroup.rotation.x = forwardLean * 0.5;
    } else {
      // Idle relaxed breathing & natural standing posture
      this.torsoMesh.rotation.x = THREE.MathUtils.lerp(this.torsoMesh.rotation.x, 0, dt * 8);
      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 0, dt * 10);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0, dt * 10);
      this.leftLeg.rotation.z = 0;
      this.rightLeg.rotation.z = 0;

      this.leftArm.rotation.x = THREE.MathUtils.lerp(
        this.leftArm.rotation.x,
        Math.sin(elapsed * 1.8) * 0.04,
        dt * 8
      );
      this.leftArm.rotation.z = 0;

      const targetRightArm = this.isDrinking
        ? -1.45 + Math.sin(elapsed * 6) * 0.15
        : -Math.sin(elapsed * 1.8) * 0.04;
      this.rightArm.rotation.x = THREE.MathUtils.lerp(
        this.rightArm.rotation.x,
        targetRightArm,
        dt * 10
      );
      this.rightArm.rotation.z = 0;

      this.bodyPivot.position.y = Math.sin(elapsed * 2.2) * 0.015;
      this.headGroup.rotation.x = Math.sin(elapsed * 1.3) * 0.03;
    }
  }

  private collides(x: number, z: number, colliders: BoxCollider[]): boolean {
    const r = this.radius;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        return true;
      }
    }
    return false;
  }
}
