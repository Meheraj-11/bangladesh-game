import * as THREE from 'three';
import { ActionButtonSpec, Interactable, MapLocationDetail, NamedZone, WeatherType } from './types';
import { createDefaultState, GameStateManager } from './state/GameState';
import { EnvironmentSystem, WEATHER_META } from './systems/EnvironmentSystem';
import { buildNeighborhood, WorldHandles } from './world/NeighborhoodBuilder';
import { PlayerController } from './player/PlayerController';
import { NPCManager } from './npc/NPCManager';
import { SoundEngine } from './audio/SoundEngine';
import { MinimapRenderer } from './ui/Minimap';
import { HUDController } from './ui/HUDController';
import { DIALOGUE_TOPICS } from './npc/DialogueData';
import { TrafficSystem } from './systems/TrafficSystem';

export class AmarBangladeshGame {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;

  private readonly stateMgr: GameStateManager;
  private readonly env: EnvironmentSystem;
  private readonly world: WorldHandles;
  private readonly player: PlayerController;
  private readonly npcs: NPCManager;
  private readonly traffic: TrafficSystem;
  private readonly sound: SoundEngine;
  private readonly minimap: MinimapRenderer;
  private readonly hud: HUDController;

  private started = false;
  private paused = false;
  private fullMapOpen = false;
  private selectedMapLocation: MapLocationDetail | null = null;
  private nearestInteractable: Interactable | null = null;
  private readonly interactRing: THREE.Mesh;

  private ceilingFanRpm = 1;
  private autoSaveTimer = 15;
  private elapsed = 0;
  private lastTime = performance.now();
  private rafId = 0;

  private readonly boundResize: () => void;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.85));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0xdbeafe, 0.0085);

    this.camera = new THREE.PerspectiveCamera(
      56,
      window.innerWidth / window.innerHeight,
      0.15,
      165
    );

    this.stateMgr = new GameStateManager();
    this.env = new EnvironmentSystem(this.stateMgr);
    this.world = buildNeighborhood(this.scene);
    this.npcs = new NPCManager(this.scene, this.world.interactables);
    this.traffic = new TrafficSystem(this.scene);
    this.sound = new SoundEngine();

    // Subtle 3D interaction highlight ring
    this.interactRing = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.56, 24),
      new THREE.MeshBasicMaterial({
        color: 0x34d399,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78
      })
    );
    this.interactRing.rotation.x = -Math.PI / 2;
    this.interactRing.visible = false;
    this.scene.add(this.interactRing);

    this.player = new PlayerController(this.scene, this.canvas, {
      onInteract: () => this.handlePrimaryInteract(),
      onPauseToggle: () => this.togglePause(),
      onMapToggle: () => this.toggleFullMap(),
      onStandUp: () => this.sound.playClick(540),
      onSleepStart: () => {
        this.sound.playClick(480);
        this.hud.showToast('😴 বিছানায় শুয়ে ঘুমালেন... শক্তি ও স্বস্তি দ্রুত বাড়ছে!');
      },
      onWakeUp: () => {
        this.sound.playClick(620);
        this.hud.showToast('☀️ ঘুম থেকে উঠলেন! আপনি চনমনে ও সতেজ বোধ করছেন।');
      }
    });

    this.minimap = new MinimapRenderer(
      this.world.bounds,
      this.world.roads,
      this.world.buildings,
      this.world.trees,
      (detail: MapLocationDetail) => {
        this.selectedMapLocation = detail;
        const dist = Math.hypot(
          this.player.position.x - detail.worldX,
          this.player.position.z - detail.worldZ
        );
        detail.distance = dist;
        this.hud.showLocationDetail(detail);
        this.sound.playClick(720);
      }
    );

    // Full Map Zoom & View Reset controls
    document.getElementById('btn-map-zoom-in')?.addEventListener('click', () => {
      this.minimap.zoomIn();
      this.sound.playClick(640);
    });
    document.getElementById('btn-map-zoom-out')?.addEventListener('click', () => {
      this.minimap.zoomOut();
      this.sound.playClick(580);
    });
    document.getElementById('btn-map-reset')?.addEventListener('click', () => {
      this.minimap.resetFullMapView();
      this.sound.playClick(520);
    });

    this.hud = new HUDController(
      {
        onStartNew: () => this.startGame(false),
        onContinue: () => this.startGame(true),
        onResume: () => this.setPaused(false),
        onSaveNow: () => {
          this.syncPlayerToState();
          this.stateMgr.save();
          this.sound.playClick(820);
          this.hud.showToast('💾 গেম সেভ হয়েছে! (Progress Saved)');
        },
        onResetSave: () => {
          this.stateMgr.reset();
          this.env.syncFromState();
          this.applyStateToWorld();
          this.setPaused(false);
          this.hud.showToast('🔄 নতুন গেম শুরু হয়েছে! (Fresh Game Started)');
        },
        onToggleTouchUI: () => {
          this.hud.setTouchUIVisible(!this.hud.touchUIVisible);
          this.sound.playClick(620);
        },
        onToggleAudio: () => {
          this.sound.init();
          this.sound.setMuted(!this.sound.muted);
        },
        onTogglePause: () => this.togglePause(),
        onToggleFullMap: () => this.toggleFullMap(),
        onCloseDialogue: () => this.closeDialogue(),
        onPromptClick: () => this.handlePrimaryInteract()
      },
      this.stateMgr.hasSavedGame()
    );

    this.applyStateToWorld();
    this.boundResize = () => this.onResize();
    window.addEventListener('resize', this.boundResize);

    // Ensure AudioContext unlocks cleanly on any subsequent click/tap/key after start
    const unlockAudio = () => {
      if (this.started) this.sound.init();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    this.rafId = requestAnimationFrame((now) => this.loop(now));
  }

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.boundResize);
    this.traffic.dispose();
    this.renderer.dispose();
  }

  private startGame(loadExisting: boolean): void {
    this.sound.init();
    if (loadExisting) {
      this.stateMgr.load();
    } else {
      this.stateMgr.reset();
    }
    this.env.syncFromState();
    this.applyStateToWorld();
    this.started = true;
    this.paused = false;
    this.player.setEnabled(true);
    this.hud.showGameHUD();
    this.sound.playClick(760);
    this.hud.showToast('🇧🇩 আমার বাংলাদেশে স্বাগতম! বড় পাড়া, নতুন দোকান ও প্রতিবেশীদের সাথে ঘুরে দেখুন।');
  }

  private applyStateToWorld(): void {
    const s = this.stateMgr.data;
    // Validate saved player coordinates against expanded colliders & world bounds
    if (!this.player.isPositionClear(s.playerX, s.playerZ, this.world.colliders, this.world.bounds)) {
      const def = createDefaultState();
      s.playerX = def.playerX;
      s.playerZ = def.playerZ;
      s.playerYaw = def.playerYaw;
    }
    this.player.setPosition(s.playerX, s.playerZ, s.playerYaw);
    this.player.setHoldingTeaCup(s.hasTeaCup);
    this.ceilingFanRpm = s.powerOn && s.ceilingFanSwitchOn ? 1 : 0;
  }

  private syncPlayerToState(): void {
    const s = this.stateMgr.data;
    s.playerX = Number(this.player.position.x.toFixed(2));
    s.playerZ = Number(this.player.position.z.toFixed(2));
    s.playerYaw = Number(this.player.facingYaw.toFixed(2));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private togglePause(): void {
    if (!this.started) return;
    if (this.hud.isDialogueOpen()) {
      this.closeDialogue();
      return;
    }
    if (this.fullMapOpen) {
      this.toggleFullMap();
      return;
    }
    this.setPaused(!this.paused);
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.hud.setPauseVisible(paused);
    this.player.setEnabled(
      this.started && !paused && !this.fullMapOpen && !this.hud.isDialogueOpen()
    );
  }

  private toggleFullMap(): void {
    if (!this.started || this.paused) return;
    this.fullMapOpen = !this.fullMapOpen;
    this.hud.setFullMapVisible(this.fullMapOpen);
    this.player.setEnabled(!this.fullMapOpen && !this.hud.isDialogueOpen());
    this.sound.playClick(640);
  }

  private closeDialogue(): void {
    this.hud.closeDialogue();
    this.player.setEnabled(this.started && !this.paused && !this.fullMapOpen);
  }

  private isInsideMess(): boolean {
    const b = this.world.messRoomBounds;
    const p = this.player.position;
    return p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ;
  }

  private getCurrentZone(): NamedZone | null {
    const p = this.player.position;
    for (const z of this.world.namedZones) {
      if (p.x >= z.minX && p.x <= z.maxX && p.z >= z.minZ && p.z <= z.maxZ) {
        return z;
      }
    }
    return null;
  }

  private getLocationLabel(zone: NamedZone | null): string {
    if (zone) return zone.label;
    if (this.player.position.z < -0.5 && this.player.position.x > -15 && this.player.position.x < -5) {
      return '🧱 মেসের গলি • Mess Alley';
    }
    return '🛣️ মূল বাজার সড়ক • Main Bazar Road';
  }

  // --- INTERACTION SYSTEM ---

  private findNearestInteractable(): Interactable | null {
    let best: Interactable | null = null;
    let bestDist = Infinity;
    const p = this.player.position;

    for (let i = 0; i < this.world.interactables.length; i++) {
      const item = this.world.interactables[i];
      const dist = Math.hypot(p.x - item.position.x, p.z - item.position.z);
      if (dist <= item.radius && dist < bestDist) {
        bestDist = dist;
        best = item;
      }
    }
    return best;
  }

  private handlePrimaryInteract(): void {
    this.sound.init();
    if (this.hud.isDialogueOpen()) {
      this.closeDialogue();
      return;
    }
    if (this.player.isSleeping) {
      this.player.wakeUp();
      return;
    }
    if (this.player.isSitting) {
      this.player.standUp();
      return;
    }
    if (!this.nearestInteractable) return;
    this.executeInteractable(this.nearestInteractable);
  }

  private executeInteractable(item: Interactable): void {
    switch (item.type) {
      case 'bed':
        if (this.player.isSitting && this.player.sitTargetId === 'mess_bed') {
          this.player.sleepOnBed();
        } else if (item.sitPosition) {
          this.player.sitAt(item.sitPosition, item.sitFacing ?? 0, item.id, 'bed');
          this.sound.playClick(520);
          this.hud.showToast('🛏️ বিছানায় বসেছেন — ঘুমাতে চাইলে আবার E চাপুন বা নিচের বাটনে ট্যাপ করুন।');
        }
        break;
      case 'mess_chair':
      case 'tong_chair':
      case 'outdoor_bench':
        if (item.sitPosition) {
          this.player.sitAt(
            item.sitPosition,
            item.sitFacing ?? 0,
            item.id,
            item.type === 'outdoor_bench' ? 'bench' : 'chair'
          );
          this.sound.playClick(520);
          if (item.type === 'tong_chair') {
            this.hud.showToast('🪑 টং দোকানে বসেছেন — গরম চা অর্ডার করুন!');
          } else if (item.type === 'outdoor_bench') {
            this.hud.showToast('🪑 বাইরের বেঞ্চে বসে পাড়ার দৃশ্য উপভোগ করছেন।');
          } else {
            this.hud.showToast('🪑 পড়ার চেয়ারে বসেছেন।');
          }
        }
        break;
      case 'candle':
        this.toggleCandle();
        break;
      case 'emergency_fan':
        this.toggleEmergencyFan();
        break;
      case 'mosquito_coil':
        this.toggleMosquitoCoil();
        break;
      case 'power_bank':
        this.togglePowerBank();
        break;
      case 'wall_switch':
        this.toggleRoomSwitch();
        break;
      case 'tong_counter':
        this.openNpcDialogue(item.npcId ?? 'rafiq_mama');
        break;
      case 'shop_counter':
        this.openShopMenu(item.shopId ?? 'shop_grocery');
        break;
      case 'tubewell': {
        const s = this.stateMgr.data;
        s.comfort = Math.min(100, s.comfort + 18);
        s.temperature = Math.max(25.5, s.temperature - 2.5);
        this.sound.playWaterSplash();
        this.hud.showToast('💧 নলকূপের ঠান্ডা পানিতে মুখ ধুলেন! দারুণ সতেজ লাগছে (+১৮ স্বস্তি)');
        break;
      }
      case 'rickshaw_bell':
        this.sound.playRickshawBell(0.2);
        this.hud.showToast('🔔 রিকশার ঘণ্টা বাজালেন — টুং-টাং!');
        break;
      case 'notice_board':
        this.openNoticeBoard();
        break;
      case 'npc':
        if (item.npcId) this.openNpcDialogue(item.npcId);
        break;
    }
  }

  private openNoticeBoard(): void {
    const s = this.stateMgr.data;
    const wLabel = WEATHER_META[s.weather].labelBn;
    const powerStatus = s.powerOn ? 'স্বাভাবিক আছে' : 'সাময়িক লোডশেডিং চলছে (স্বয়ংক্রিয়ভাবে ফিরে আসবে)';
    this.player.setEnabled(false);
    this.hud.openDialogue({
      avatar: '📋',
      name: 'পাড়ার নোটিশ বোর্ড',
      role: 'Neighborhood Bulletin • সবুজ পাড়া',
      text: `১) শুক্রবার বিকেলে বটতলা চত্বরে পাড়ার প্রীতি ক্রিকেট ম্যাচ অনুষ্ঠিত হবে।\n২) বর্তমান আবহাওয়া: ${wLabel} | বিদ্যুৎ অবস্থা: ${powerStatus}।\n৩) পূর্ব বাজারে হাজী চাচার নতুন টং দোকান ও আল-আমিন মুদি দোকান খোলা আছে!`,
      buttons: [
        {
          label: 'ধন্যবাদ (Close)',
          primary: true,
          onClick: () => this.closeDialogue()
        }
      ]
    });
  }

  // --- ROOM SURVIVAL ACTIONS (Personal gear — main electricity is 100% automatic) ---

  private toggleCandle(): void {
    const s = this.stateMgr.data;
    s.candleLit = !s.candleLit;
    if (s.candleLit) {
      this.sound.playMatchStrike();
      this.hud.showToast('🕯️ মোমবাতি জ্বালানো হয়েছে (Candle Lit)');
    } else {
      this.sound.playClick(460);
      this.hud.showToast('🕯️ মোমবাতি নেভানো হয়েছে (Candle Extinguished)');
    }
  }

  private toggleEmergencyFan(): void {
    const s = this.stateMgr.data;
    if (!s.emergencyFanOn && s.emergencyFanBattery <= 1) {
      this.hud.showToast('⚠️ চার্জার ফ্যানের চার্জ শেষ! বিদ্যুৎ ফিরলে আপনাআপনি চার্জ হবে।', true);
      return;
    }
    s.emergencyFanOn = !s.emergencyFanOn;
    this.sound.playClick(s.emergencyFanOn ? 740 : 480);
    this.hud.showToast(
      s.emergencyFanOn
        ? '🌀 চার্জার ফ্যান চালু হয়েছে! গরম কমছে।'
        : '🌀 চার্জার ফ্যান বন্ধ করা হয়েছে।'
    );
  }

  private toggleMosquitoCoil(): void {
    const s = this.stateMgr.data;
    s.mosquitoCoilLit = !s.mosquitoCoilLit;
    if (s.mosquitoCoilLit) {
      s.mosquitoCoilTimer = 180;
      this.sound.playMatchStrike();
      this.hud.showToast('🦟 মশার কয়েল জ্বালানো হয়েছে — মশা পালিয়ে যাবে!');
    } else {
      this.sound.playClick(440);
      this.hud.showToast('🦟 মশার কয়েল নেভানো হয়েছে।');
    }
  }

  private togglePowerBank(): void {
    const s = this.stateMgr.data;
    if (!s.phoneCharging && s.powerBankBattery <= 1) {
      this.hud.showToast('⚠️ পাওয়ার ব্যাংকের চার্জ শেষ! বিদ্যুৎ ফিরলে চার্জ হবে।', true);
      return;
    }
    s.phoneCharging = !s.phoneCharging;
    this.sound.playClick(s.phoneCharging ? 880 : 500);
    this.hud.showToast(
      s.phoneCharging
        ? '🔋 ফোন পাওয়ার ব্যাংকে সংযুক্ত হয়েছে (Charging Phone)'
        : '🔋 ফোন পাওয়ার ব্যাংক থেকে খোলা হয়েছে।'
    );
  }

  private toggleRoomSwitch(): void {
    const s = this.stateMgr.data;
    if (!s.powerOn) {
      this.sound.playClick(320);
      this.hud.showToast('⚡ এখন লোডশেডিং! বিদ্যুৎ আপনাআপনি ফিরলে সুইচ কাজ করবে।', true);
      return;
    }
    s.roomLightSwitchOn = !s.roomLightSwitchOn;
    s.ceilingFanSwitchOn = s.roomLightSwitchOn;
    this.sound.playClick(650);
    this.hud.showToast(
      s.roomLightSwitchOn
        ? '💡 রুমের লাইট ও সিলিং ফ্যান চালু হয়েছে।'
        : '💡 রুমের লাইট ও সিলিং ফ্যান বন্ধ করা হয়েছে।'
    );
  }

  private restOnBed(): void {
    const s = this.stateMgr.data;
    s.energy = Math.min(100, s.energy + 30);
    s.comfort = Math.min(100, s.comfort + 18);
    this.sound.playClick(600);
    this.hud.showToast('😌 বিছানায় একটু বিশ্রাম নিলেন! শক্তি ও স্বস্তি বেড়েছে।');
  }

  // --- TONG DOKAN ACTIONS (WORKS AT ALL 3 TEA STALLS!) ---

  private orderTea(kind: 'milk' | 'red'): void {
    const s = this.stateMgr.data;
    const cost = kind === 'milk' ? 10 : 5;
    if (s.money < cost) {
      this.hud.showToast('💸 পর্যাপ্ত টাকা নেই! মেসের বন্ধু সোহেলের সাথে কথা বলুন।', true);
      return;
    }
    s.money -= cost;
    s.hasTeaCup = true;
    s.teaSipsLeft = 3;
    this.player.setHoldingTeaCup(true);
    this.sound.playTeaSip();
    this.hud.showToast(
      kind === 'milk'
        ? '🍵 গরম দুধ চা নেওয়া হয়েছে (-১০৳)! এখন চা পান করুন।'
        : '🫖 গরম লাল চা নেওয়া হয়েছে (-৫৳)! এখন চা পান করুন।'
    );
  }

  private drinkTea(): void {
    const s = this.stateMgr.data;
    if (!s.hasTeaCup || s.teaSipsLeft <= 0) return;
    s.teaSipsLeft -= 1;
    s.energy = Math.min(100, s.energy + 12);
    s.comfort = Math.min(100, s.comfort + 10);
    this.player.triggerDrinkAnimation();
    this.sound.playTeaSip();

    if (s.teaSipsLeft <= 0) {
      s.hasTeaCup = false;
      s.teaCupsDrunk += 1;
      window.setTimeout(() => this.player.setHoldingTeaCup(false), 1600);
      this.hud.showToast('😋 আহ! দারুণ চা ছিল! কাপ শেষ।');
    } else {
      this.hud.showToast(`☕ গরম চায়ে চুমুক দিলেন! (আরো ${s.teaSipsLeft} চুমুক বাকি)`);
    }
  }

  private buyBiscuit(): void {
    const s = this.stateMgr.data;
    if (s.money < 10) {
      this.hud.showToast('💸 বিস্কুট কিনতে ১০৳ লাগবে!', true);
      return;
    }
    s.money -= 10;
    s.biscuits += 1;
    this.sound.playClick(740);
    this.hud.showToast('🍪 টোস্ট বিস্কুট কিনলেন (-১০৳)!');
  }

  private eatBiscuit(): void {
    const s = this.stateMgr.data;
    if (s.biscuits <= 0) return;
    s.biscuits -= 1;
    s.energy = Math.min(100, s.energy + 16);
    this.sound.playBiscuitCrunch();
    this.hud.showToast('🍪 মচমচে বিস্কুট খেলেন! (+১৬ শক্তি)');
  }

  private openNpcDialogue(npcId: string): void {
    const npc = this.npcs.getById(npcId);
    if (!npc) return;
    const s = this.stateMgr.data;
    const isNight = this.stateMgr.isNight();
    const text = this.npcs.getDialogue(npcId, s, isNight);

    const isTongOwner =
      npcId === 'rafiq_mama' ||
      npcId === 'haji_chacha' ||
      npcId === 'jasim_bhai' ||
      npcId === 'kashem_bhai' ||
      npcId === 'bareq_mama';

    const buildDialogueMenu = (currentGreeting: string) => {
      const buttons: { label: string; primary?: boolean; onClick: () => void }[] = [];

      // Specific shop / stall actions
      if (isTongOwner) {
        buttons.push(
          {
            label: '🍵 দুধ চা অর্ডার (১০৳)',
            primary: true,
            onClick: () => {
              this.orderTea('milk');
              this.closeDialogue();
            }
          },
          {
            label: '🫖 লাল চা অর্ডার (৫৳)',
            onClick: () => {
              this.orderTea('red');
              this.closeDialogue();
            }
          },
          {
            label: '🍪 বিস্কুট কিনুন (১০৳)',
            onClick: () => {
              this.buyBiscuit();
              this.closeDialogue();
            }
          }
        );
        if (s.hasTeaCup) {
          buttons.push({
            label: '☕ চা পান করুন',
            onClick: () => {
              this.drinkTea();
              this.closeDialogue();
            }
          });
        }
      } else if (npcId === 'majid_mia') {
        buttons.push({
          label: '🛒 বিস্কুট প্যাকেট কিনুন (১০৳)',
          primary: true,
          onClick: () => {
            this.buyBiscuit();
            this.closeDialogue();
          }
        });
      } else if (npcId === 'sohel' && s.money < 60) {
        buttons.push({
          label: '💼 মেসের হিসাব মিলিয়ে ৫০৳ নিন',
          primary: true,
          onClick: () => {
            s.money += 50;
            s.energy = Math.max(10, s.energy - 8);
            this.sound.playClick(860);
            this.hud.showToast('💰 সোহেল আপনাকে ৫০৳ দিয়েছে! এখন টংয়ে চা খেতে পারেন।');
            this.closeDialogue();
          }
        });
      }

      // Add diverse conversation topic buttons
      for (const topic of DIALOGUE_TOPICS) {
        buttons.push({
          label: `${topic.icon} ${topic.labelBn}`,
          onClick: () => {
            const resp = this.npcs.getTopicResponse(npcId, topic.id, s, isNight);
            s.comfort = Math.min(100, s.comfort + resp.comfort);
            s.energy = Math.min(100, s.energy + resp.energy);
            this.sound.playClick(720);
            this.hud.showToast(`✨ ${topic.labelBn}: +${resp.comfort} স্বস্তি, +${resp.energy} শক্তি`);

            // Multi-turn options: choose another topic or close
            const subButtons: { label: string; primary?: boolean; onClick: () => void }[] = [
              {
                label: '🔄 অন্য বিষয়ে কথা বলুন (Talk More)',
                primary: true,
                onClick: () => buildDialogueMenu(currentGreeting)
              }
            ];

            if (isTongOwner) {
              subButtons.push({
                label: '🍵 এক কাপ গরম চা দিন',
                onClick: () => {
                  this.orderTea('milk');
                  this.closeDialogue();
                }
              });
            }

            subButtons.push({
              label: 'আচ্ছা, পরে কথা হবে (Close)',
              onClick: () => this.closeDialogue()
            });

            this.hud.updateDialogueContent({
              text: resp.text,
              buttons: subButtons
            });
          }
        });
      }

      buttons.push({
        label: 'আচ্ছা, পরে কথা হবে (Close)',
        onClick: () => this.closeDialogue()
      });

      this.hud.openDialogue({
        avatar: npc.avatar,
        name: npc.nameBn,
        role: npc.roleBn,
        text: currentGreeting,
        buttons
      });
    };

    this.player.setEnabled(false);
    buildDialogueMenu(text);
  }

  // --- DIVERSE AUTHENTIC BANGLADESHI SHOPPING SYSTEM ---

  private openShopMenu(shopId: string): void {
    const s = this.stateMgr.data;
    const catalog: Record<
      string,
      {
        nameBn: string;
        roleBn: string;
        avatar: string;
        greetingBn: string;
        items: {
          nameBn: string;
          price: number;
          energy: number;
          comfort: number;
          toast: string;
          sound: 'click' | 'crunch' | 'water' | 'bell';
        }[];
      }
    > = {
      shop_grocery: {
        nameBn: 'আল-আমিন স্টোর',
        roleBn: 'মজিদ মিয়া • মুদি দোকানদার',
        avatar: '🛒',
        greetingBn: 'আসসালামু আলাইকুম ভাই! আল-আমিন মুদি দোকানে স্বাগতম। মেসের বাজার লাগলে বলেন — চাল, ডাল, তেল, ডিম, বিস্কুট সব ফ্রেশ আছে!',
        items: [
          { nameBn: 'মিনিকেট চাল (১ কেজি)', price: 65, energy: 20, comfort: 20, toast: '🍚 মিনিকেট চাল কিনলেন (-৬৫৳)! মেসের খাবার নিশ্চিত।', sound: 'click' },
          { nameBn: 'মসুর ডাল (৫০০ গ্রাম)', price: 60, energy: 15, comfort: 15, toast: '🍲 মসুর ডাল কিনলেন (-৬০৳)! পুষ্টিকর মেসের মিল।', sound: 'click' },
          { nameBn: 'তাজা মুরগির ডিম (৪টি)', price: 48, energy: 25, comfort: 18, toast: '🥚 তাজা ডিম কিনলেন (-৪৮৳)! প্রোটিনের দারুণ যোগান।', sound: 'click' },
          { nameBn: 'এনার্জি বিস্কুট প্যাকেট', price: 20, energy: 24, comfort: 15, toast: '🍪 এনার্জি বিস্কুট কিনলেন (-২০৳)! (+২৪ শক্তি)', sound: 'crunch' }
        ]
      },
      shop_kitchen_market: {
        nameBn: 'কাঁচাবাজার ও সবজি আড়ত',
        roleBn: 'রশিদ মিয়া • সবজি বিক্রেতা',
        avatar: '🥬',
        greetingBn: 'শুভ সকাল ভাই! সকালের তাজা তরিতরকারি এসে গেছে। দেশি আলু, গোল কচি লাউ, টমেটো, কাঁচামরিচ — একদম জ্যান্ত বাজার!',
        items: [
          { nameBn: 'দেশি গোল আলু (১ কেজি)', price: 35, energy: 20, comfort: 15, toast: '🥔 ১ কেজি দেশি আলু কিনলেন (-৩৫৳)!', sound: 'click' },
          { nameBn: 'কচি গোল লাউ', price: 40, energy: 18, comfort: 28, toast: '🍈 কচি লাউ কিনলেন (-৪০৳)! পেট ঠান্ডা ও স্বস্তিকর।', sound: 'crunch' },
          { nameBn: 'লাল পাকা টমেটো (৫০০ গ্রাম)', price: 30, energy: 15, comfort: 20, toast: '🍅 তাজা টমেটো কিনলেন (-৩০৳)! ভিটামিন সমৃদ্ধ।', sound: 'crunch' },
          { nameBn: 'কাঁচামরিচ ও ধনেপাতা', price: 10, energy: 12, comfort: 12, toast: '🌶️ ঝাল কাঁচামরিচ ও ধনেপাতা কিনলেন (-১০৳)! চনমনে স্বাদ।', sound: 'click' }
        ]
      },
      shop_fruit_stall: {
        nameBn: 'সততা ফল ভাণ্ডার',
        roleBn: 'আবুল কালাম • ফল বিক্রেতা',
        avatar: '🥭',
        greetingBn: 'স্বাগতম ভাই! সততা ফল ভাণ্ডারের তাজা ও মিষ্টি ফল খেলে ক্লান্তি একদম দূর হয়ে যাবে। ডাবের পানি আর পাকা আম খুবই মিষ্টি!',
        items: [
          { nameBn: 'মিষ্টি পাকা আম', price: 40, energy: 35, comfort: 25, toast: '🥭 রসালো পাকা আম খেলেন (-৪০৳)! দারুণ মিষ্টি (+৩৫ শক্তি)।', sound: 'crunch' },
          { nameBn: 'ডাবের ঠান্ডা মিষ্টি পানি', price: 50, energy: 25, comfort: 40, toast: '🥥 ঠান্ডা ডাবের পানি পান করলেন (-৫০৳)! শরীর একদম জুড়িয়ে গেল (+৪০ স্বস্তি)।', sound: 'water' },
          { nameBn: 'সবরি কলা (২টি)', price: 20, energy: 26, comfort: 16, toast: '🍌 পুষ্টিকর কলা খেলেন (-২০৳)! দ্রুত এনার্জি বুস্ট (+২৬ শক্তি)।', sound: 'crunch' },
          { nameBn: 'কাশ্মীরি লাল আপেল', price: 35, energy: 22, comfort: 20, toast: '🍎 মচমচে লাল আপেল খেলেন (-৩৫৳)! স্বাস্থ্যকর ও তাজা।', sound: 'crunch' }
        ]
      },
      shop_fish_market: {
        nameBn: 'মেঘনা তাজা মাছের আড়ত',
        roleBn: 'বাবুল সর্দার • মাছ ব্যবসায়ী',
        avatar: '🐟',
        greetingBn: 'আসসালামু আলাইকুম! মেঘনা নদীর জ্যান্ত রূপালী ইলিশ আর পদ্মার রুই মাছ এসেছে সকালের ট্রলারে। একেবারে টাটকা মাছ!',
        items: [
          { nameBn: 'মেঘনার রূপালী ইলিশ', price: 180, energy: 45, comfort: 45, toast: '🐟 মেঘনার তাজা রূপালী ইলিশ কিনলেন (-১৮০৳)! মেসের ভোজে আজ জমজমাট উৎসব।', sound: 'water' },
          { nameBn: 'বড় নদীর রুই মাছের পেটি', price: 100, energy: 35, comfort: 30, toast: '🐠 বড় রুই মাছ কিনলেন (-১০০৳)! পুষ্টিকর ও সুস্বাদু।', sound: 'water' },
          { nameBn: 'নদীর তাজা কাচকি মাছ', price: 50, energy: 25, comfort: 22, toast: '🦐 নদীর ছোট মাছ কিনলেন (-৫০৳)! স্বাস্থ্যকর চচ্চড়ি।', sound: 'water' }
        ]
      },
      shop_restaurant: {
        nameBn: 'আমানত হোটেল ও রেস্তোরাঁ',
        roleBn: 'সোলেমান ভাই • হোটেল ম্যানেজার',
        avatar: '🍛',
        greetingBn: 'আসুন ভাই, গরম গরম খাবার রেডি! খাসির কাচ্চি বিরিয়ানি, পরোটা-সবজি আর রুই মাছ-ভাত সারাদিনই পাওয়া যায়। কী খাবেন বলুন!',
        items: [
          { nameBn: 'খাসির স্পেশাল কাচ্চি বিরিয়ানি', price: 150, energy: 55, comfort: 45, toast: '🍛 গরম কাচ্চি বিরিয়ানি খেলেন (-১৫০৳)! তৃপ্তিতে মন ভরে গেল (+৫৫ শক্তি)।', sound: 'crunch' },
          { nameBn: 'গরম পরোটা ও ডাল-ভাজি', price: 25, energy: 30, comfort: 20, toast: '🫓 সকালের মচমচে পরোটা ও ভাজি খেলেন (-২৫৳)!', sound: 'crunch' },
          { nameBn: 'রুই মাছের ঝোল ও গরম ভাত', price: 70, energy: 40, comfort: 32, toast: '🍲 রুই মাছ ও ভাত খেলেন (-৭০৳)! মেসের সেরা আরামদায়ক দুপুরের খাবার।', sound: 'click' },
          { nameBn: 'ঘন সুস্বাদু বোরহানি', price: 35, energy: 18, comfort: 28, toast: '🥛 ঠান্ডা বোরহানি পান করলেন (-৩৫৳)! হজম ও সতেজতা বাড়ল।', sound: 'water' }
        ]
      },
      shop_sweets: {
        nameBn: 'মধুবন মিষ্টান্ন ভাণ্ডার',
        roleBn: 'দুলাল দা • প্রধান ময়রা',
        avatar: '🍯',
        greetingBn: 'নমস্কার ভাই! গরম কড়াই থেকে এইমাত্র মচমচে জিলাপি নামালাম। বগুড়ার আসল খাঁটি দই আর রসগোল্লাও সাজানো আছে। মিষ্টিমুখ করুন!',
        items: [
          { nameBn: 'গরম মচমচে জিলাপি (৪টি)', price: 30, energy: 35, comfort: 30, toast: '🥨 রসে ভরা মচমচে জিলাপি খেলেন (-৩০৳)! মুখে মিষ্টি স্বাদ (+৩৫ শক্তি)।', sound: 'crunch' },
          { nameBn: 'ঐতিহ্যবাহী বগুড়ার দই', price: 50, energy: 28, comfort: 42, toast: '🥣 খাঁটি বগুড়ার মিষ্টি দই খেলেন (-৫০৳)! শরীর ও মন ঠান্ডা (+৪২ স্বস্তি)।', sound: 'click' },
          { nameBn: 'স্পেশাল রসগোল্লা (২টি)', price: 25, energy: 25, comfort: 22, toast: '🍬 নরম তুলতুলে রসগোল্লা খেলেন (-২৫৳)! দারুণ মিষ্টি।', sound: 'crunch' }
        ]
      },
      shop_fuchka: {
        nameBn: 'বিসমিল্লাহ ফুচকা ও চটপটি',
        roleBn: 'শামীম ভাই • ফুচকা মাস্টার',
        avatar: '🍲',
        greetingBn: 'বসেন ভাই! বিসমিল্লাহ ফুচকার স্পেশাল তেঁতুলের টক আর ডিম চটপটির স্বাদ মুখে লেগে থাকবে। কতটুকু ঝাল খাবেন বলেন?',
        items: [
          { nameBn: 'স্পেশাল টক-ঝাল ফুচকা', price: 50, energy: 38, comfort: 35, toast: '🥟 মচমচে টক-ঝাল ফুচকা খেলেন (-৫০৳)! জিহ্বায় দারুণ চনমনে স্বাদ (+৩৮ শক্তি)।', sound: 'crunch' },
          { nameBn: 'ডিম সেদ্ধ স্পেশাল চটপটি', price: 60, energy: 45, comfort: 35, toast: '🍲 গরম ডিম চটপটি খেলেন (-৬০৳)! পুষ্টিকর ও সুস্বাদু (+৪৫ শক্তি)।', sound: 'crunch' }
        ]
      },
      shop_pharmacy: {
        nameBn: 'বিসমিল্লাহ ফার্মেসি',
        roleBn: 'ডাঃ আনোয়ার • রেজিস্টার্ড ফার্মাসিস্ট',
        avatar: '💊',
        greetingBn: 'আসসালামু আলাইকুম! কোনো শারীরিক সমস্যা বা মাথা ব্যথা? প্রয়োজনীয় ঔষধ, স্যালাইন ও ব্যান্ডেজ সবই আছে। সাবধানে থাকবেন।',
        items: [
          { nameBn: 'খাবার স্যালাইন (ওরস্যালাইন)', price: 10, energy: 35, comfort: 40, toast: '🥤 ওরস্যালাইন পান করলেন (-১০৳)! পানিশূন্যতা দূর হয়ে চাঙ্গা হলেন।', sound: 'water' },
          { nameBn: 'প্যারাসিটামল ট্যাবলেট পাতা', price: 15, energy: 20, comfort: 30, toast: '💊 প্যারাসিটামল নিলেন (-১৫৳)! জ্বর ও শরীরের ব্যথা উপশম হলো।', sound: 'click' },
          { nameBn: 'ভিটামিন-সি চিবানো ট্যাবলেট', price: 20, energy: 22, comfort: 22, toast: '🍊 ভিটামিন-সি খেলেন (-২০৳)! রোগ প্রতিরোধ ক্ষমতা বৃদ্ধি পেল।', sound: 'crunch' }
        ]
      },
      shop_diagnostic: {
        nameBn: 'মাতৃছায়া ডায়াগনস্টিক ও ফার্মেসি',
        roleBn: 'ডাঃ রফিকুল ইসলাম • চিফ কনসালট্যান্ট',
        avatar: '🏥',
        greetingBn: 'আসসালামু আলাইকুম। মাতৃছায়া ডায়াগনস্টিকে ২৪ ঘণ্টা জরুরী স্বাস্থ্য সেবা ও পরামর্শ দেওয়া হয়। সুস্থ থাকুন, নিরাপদে থাকুন।',
        items: [
          { nameBn: 'জরুরি হেলথ চেকআপ ও স্যালাইন', price: 30, energy: 35, comfort: 40, toast: '🩺 দ্রুত হেলথ চেকআপ ও স্যালাইন নিলেন (-৩০৳)! স্বাস্থ্য পুনরুদ্ধার হলো।', sound: 'water' },
          { nameBn: 'ব্যথানাশক ও গ্যাস্ট্রিক সিরাপ', price: 25, energy: 20, comfort: 30, toast: '🧪 সিরাপ সেবন করলেন (-২৫৳)! দ্রুত আরাম মিলল।', sound: 'click' }
        ]
      },
      shop_bkash: {
        nameBn: 'জনতা ভ্যারাইটিজ স্টোর',
        roleBn: 'কামাল ভাই • টেলিকম এজেন্ট',
        avatar: '📱',
        greetingBn: 'স্বাগতম ভাই! বিকাশ, নগদ ক্যাশ-আউট, মোবাইলে রিচার্জ আর খাতা-কলম সবই পাবেন। কী সেবা প্রয়োজন বলেন!',
        items: [
          { nameBn: '৫০৳ মোবাইল রিচার্জ / ফ্লেক্সিলোড', price: 50, energy: 10, comfort: 25, toast: '📲 ফোনে ৫০৳ রিচার্জ করলেন (-৫০৳)! বন্ধুদের সাথে কথা বলুন।', sound: 'click' },
          { nameBn: 'জরুরী বলপেন ও নোটপ্যাড', price: 25, energy: 15, comfort: 15, toast: '🖊️ কলম ও নোটপ্যাড কিনলেন (-২৫৳)! মেসের হিসাব লিখুন।', sound: 'click' }
        ]
      },
      shop_telecom: {
        nameBn: 'ডিজিটাল বিকাশ-নগদ সেবা',
        roleBn: 'শুভ ভাই • ডিজিটাল সার্ভিস এজেন্ট',
        avatar: '💳',
        greetingBn: 'আসসালামু আলাইকুম ভাই! ডিজিটাল বিকাশ ও নগদ সেবা পয়েন্টে স্বাগতম। ক্যাশ-আউট, মোবাইল ব্যাংকিং ও ফোন এক্সেসরিজ পাওয়া যায়।',
        items: [
          { nameBn: '৫০৳ মোবাইল ব্যালেন্স রিচার্জ', price: 50, energy: 10, comfort: 25, toast: '📱 মোবাইল রিচার্জ সফল (-৫০৳)! ইন্টারনেট ও কল চালু।', sound: 'click' },
          { nameBn: 'ইউএসবি ফাস্ট চার্জিং কেবল', price: 60, energy: 15, comfort: 30, toast: '🔌 নতুন চার্জিং কেবল কিনলেন (-৬০৳)! পাওয়ার ব্যাংকে দ্রুত ফোন চার্জ দিন।', sound: 'click' }
        ]
      },
      shop_tailor: {
        nameBn: 'জননী টেইলার্স অ্যান্ড ফেব্রিক্স',
        roleBn: 'আলমগীর ওস্তাদ • মাস্টার টেইলার',
        avatar: '🧵',
        greetingBn: 'আসসালামু আলাইকুম ভাই! নিখুঁত ফিটিং সুতি পাঞ্জাবি, পায়জামা আর শার্টের জন্য জননী টেইলার্স পাড়ার সেরা দোকান। বলুন কীভাবে সাহায্য করব!',
        items: [
          { nameBn: 'সুতি পাঞ্জাবি সেলাই অর্ডার', price: 150, energy: 15, comfort: 45, toast: '🥼 পাঞ্জাবি সেলাই অর্ডার দিলেন (-১৫০৳)! নতুন পোশাকে দারুণ আভিজাত্য।', sound: 'click' },
          { nameBn: 'আরামদায়ক সুতি লুঙ্গি মাপ ও সেলাই', price: 60, energy: 12, comfort: 30, toast: '🩳 সুতি লুঙ্গির সেলাই নিলেন (-৬০৳)! মেসে আরামদায়ক পরিধান।', sound: 'click' }
        ]
      },
      shop_salon: {
        nameBn: 'ঢাকা সেলুন ও লন্ড্রি',
        roleBn: 'মানিক ভাই • সিনিয়র হেয়ার ড্রেসার',
        avatar: '✂️',
        greetingBn: 'আসুন ভাই, চেয়ারে বসেন! চুল-দাড়ি কাটিং, শেভিং আর ঠান্ডা ফেস ম্যাসাজ করে দিচ্ছি — একদম ফ্রেশ লাগবে!',
        items: [
          { nameBn: 'স্মার্ট হেয়ারকাট ও দাড়ি ট্রিম', price: 70, energy: 20, comfort: 42, toast: '💇‍♂️ চুল ও দাড়ি কাটলেন (-৭০৳)! দারুণ স্মার্ট ও ঝরঝরে দেখাচ্ছে (+৪২ স্বস্তি)।', sound: 'click' },
          { nameBn: 'ঠান্ডা আরামদায়ক হেড ম্যাসাজ', price: 40, energy: 15, comfort: 35, toast: '💆‍♂️ হেড ম্যাসাজ নিলেন (-৪০৳)! সারাদিনের মানসিক চাপ দূর হলো (+৩৫ স্বস্তি)।', sound: 'click' }
        ]
      },
      shop_boighar: {
        nameBn: 'জ্ঞানালোক বই বিতান ও স্টেশনারি',
        roleBn: 'মতিউর মাস্টার • শিক্ষক ও গ্রন্থানুরাগী',
        avatar: '📚',
        greetingBn: 'স্বাগতম ভাগিনা! জ্ঞানালোক বইঘরে পাঠ্যবই, বিখ্যাত বাংলা উপন্যাস, খাতা-কলম আর স্টেশনারি রয়েছে। বই পড়ার চেয়ে বড় আনন্দ আর নেই!',
        items: [
          { nameBn: 'স্টুডেন্ট খাতা ও জেলপেন সেট', price: 35, energy: 20, comfort: 22, toast: '📓 পড়ার খাতা ও কলম সেট কিনলেন (-৩৫৳)! পড়াশোনায় মনোযোগ দিন।', sound: 'click' },
          { nameBn: 'হুমায়ূন আহমেদের জনপ্রিয় উপন্যাস', price: 80, energy: 25, comfort: 45, toast: '📖 বাংলা উপন্যাস কিনলেন (-৮০৳)! সাহিত্য পাঠে চমৎকার মানসিক প্রশান্তি।', sound: 'click' }
        ]
      },
      shop_hardware: {
        nameBn: 'ভাই ভাই হার্ডওয়্যার ও ইলেকট্রিক',
        roleBn: 'খলিল ভাই • ইলেকট্রিশিয়ান ও ব্যবসায়ী',
        avatar: '🔧',
        greetingBn: 'আসসালামু আলাইকুম! মেসের ফ্যান রেগুলেটর, এলইডি বাল্ব, টেস্টার, ব্যাটারি বা রং লাগলে ভাই ভাই হার্ডওয়্যারে আসল পণ্য পাবেন!',
        items: [
          { nameBn: 'সুপার ব্রাইট এলইডি বাল্ব (১২ ওয়াট)', price: 85, energy: 20, comfort: 35, toast: '💡 নতুন এলইডি বাল্ব কিনলেন (-৮৫৳)! মেস রুম এখন উজ্জ্বল আলোয় ঝলমলে।', sound: 'click' },
          { nameBn: 'হাই পাওয়ার ব্যাটারি জোড়া', price: 25, energy: 15, comfort: 18, toast: '🔋 ব্যাটারি জোড়া কিনলেন (-২৫৳)! এমার্জেন্সি ডিভাইসে ব্যবহারযোগ্য।', sound: 'click' }
        ]
      },
      club_library: {
        nameBn: 'তরুণ সংঘ পাঠাগার ও ক্লাব',
        roleBn: 'আরিফ ভাই • পাঠাগার সাধারণ সম্পাদক',
        avatar: '📖',
        greetingBn: 'আসুন ভাই, ক্লাবে স্বাগতম! এখানে প্রতিদিনের জাতীয় দৈনিক পত্রিকা রাখা আছে এবং মুক্ত বইপড়ার দারুণ আড্ডা চলে।',
        items: [
          { nameBn: 'আজকের জাতীয় দৈনিক পত্রিকা পাঠ', price: 5, energy: 12, comfort: 20, toast: '📰 আজকের জাতীয় পত্রিকা পড়লেন (-৫৳)! দেশ-বিদেশের তাজা খবরের আপডেট।', sound: 'click' },
          { nameBn: 'পাঠাগারের বার্ষিক পাঠক সদস্যপদ', price: 50, energy: 20, comfort: 38, toast: '🪪 পাঠাগারের সদস্য হলেন (-৫০৳)! প্রতিদিন নিয়মিত বই পড়ার সুবিধা।', sound: 'click' }
        ]
      }
    };

    const shop = catalog[shopId] || catalog.shop_grocery;

    const renderShopDialogue = () => {
      const buttons: { label: string; primary?: boolean; onClick: () => void }[] = [];

      for (const item of shop.items) {
        buttons.push({
          label: `${item.nameBn} (${item.price}৳)`,
          primary: s.money >= item.price,
          onClick: () => {
            if (s.money < item.price) {
              this.hud.showToast('💸 পর্যাপ্ত টাকা নেই! মেসের বন্ধুদের সাথে কথা বলে টাকা সংগ্রহ করুন।', true);
              return;
            }
            s.money -= item.price;
            s.energy = Math.min(100, s.energy + item.energy);
            s.comfort = Math.min(100, s.comfort + item.comfort);

            if (item.sound === 'crunch') {
              this.sound.playBiscuitCrunch();
            } else if (item.sound === 'water') {
              this.sound.playWaterSplash();
            } else if (item.sound === 'bell') {
              this.sound.playRickshawBell();
            } else {
              this.sound.playClick(720);
            }

            this.hud.showToast(item.toast);
            renderShopDialogue();
          }
        });
      }

      buttons.push({
        label: 'ধন্যবাদ, পরে আসবো (Close)',
        onClick: () => this.closeDialogue()
      });

      const currentBalanceText = `\n\n💰 আপনার বর্তমান ব্যালেন্স: ${s.money}৳ | শক্তি: ${Math.round(s.energy)}% | স্বস্তি: ${Math.round(s.comfort)}%`;

      if (this.hud.isDialogueOpen()) {
        this.hud.updateDialogueContent({
          text: shop.greetingBn + currentBalanceText,
          buttons
        });
      } else {
        this.hud.openDialogue({
          avatar: shop.avatar,
          name: shop.nameBn,
          role: shop.roleBn,
          text: shop.greetingBn + currentBalanceText,
          buttons
        });
      }
    };

    this.player.setEnabled(false);
    renderShopDialogue();
  }

  // --- CLICKABLE CONTEXTUAL ACTION BAR (WORKS ON BOTH PC & MOBILE) ---

  private buildContextualActions(zone: NamedZone | null): ActionButtonSpec[] {
    const s = this.stateMgr.data;
    const actions: ActionButtonSpec[] = [];
    const inMess = Boolean(zone?.isMess);
    const inTong = Boolean(zone?.isTong);

    if (this.player.isSleeping) {
      actions.push({
        id: 'wake_up',
        icon: '☀️',
        label: 'ঘুম থেকে উঠুন (Wake Up)',
        primary: true,
        onClick: () => this.player.wakeUp()
      });
      return actions;
    }

    if (this.player.isSitting) {
      actions.push({
        id: 'stand_up',
        icon: '🧍',
        label: 'উঠে দাঁড়ান (Stand Up)',
        primary: true,
        onClick: () => this.player.standUp()
      });
      if (this.player.sitTargetId === 'mess_bed') {
        actions.push(
          {
            id: 'sleep_on_bed',
            icon: '😴',
            label: 'বিছানায় ঘুমান (Sleep)',
            primary: this.stateMgr.isNight() || s.energy < 40,
            onClick: () => this.player.sleepOnBed()
          },
          {
            id: 'rest_bed',
            icon: '😌',
            label: 'বিশ্রাম নিন (+শক্তি)',
            onClick: () => this.restOnBed()
          }
        );
      }
    }

    if (inMess) {
      actions.push(
        {
          id: 'act_candle',
          icon: '🕯️',
          label: s.candleLit ? 'মোমবাতি নেভান' : 'মোমবাতি জ্বালান',
          active: s.candleLit,
          onClick: () => this.toggleCandle()
        },
        {
          id: 'act_efan',
          icon: '🌀',
          label: s.emergencyFanOn ? 'চার্জার ফ্যান বন্ধ' : 'চার্জার ফ্যান চালু',
          active: s.emergencyFanOn,
          onClick: () => this.toggleEmergencyFan()
        },
        {
          id: 'act_coil',
          icon: '🦟',
          label: s.mosquitoCoilLit ? 'কয়েল নেভান' : 'মশার কয়েল জ্বালান',
          active: s.mosquitoCoilLit,
          onClick: () => this.toggleMosquitoCoil()
        },
        {
          id: 'act_pb',
          icon: '🔋',
          label: s.phoneCharging ? 'চার্জ বন্ধ করুন' : 'পাওয়ার ব্যাংক',
          active: s.phoneCharging,
          onClick: () => this.togglePowerBank()
        }
      );
      if (!this.player.isSitting && !this.player.isSleeping) {
        actions.push(
          {
            id: 'act_mess_bed_sit',
            icon: '🪑',
            label: 'বিছানায় বসুন',
            onClick: () => {
              const bed = this.world.interactables.find((i) => i.id === 'mess_bed');
              if (bed && bed.sitPosition) {
                this.player.sitAt(bed.sitPosition, bed.sitFacing ?? 0, bed.id, 'bed');
                this.sound.playClick(520);
                this.hud.showToast('🛏️ বিছানায় বসেছেন — বিশ্রাম বা ঘুমাতে পারেন।');
              }
            }
          },
          {
            id: 'act_mess_bed_sleep',
            icon: '😴',
            label: 'বিছানায় ঘুমান',
            primary: this.stateMgr.isNight() || s.energy < 40,
            onClick: () => this.player.sleepOnBed()
          },
          {
            id: 'act_mess_chair',
            icon: '🪑',
            label: 'চেয়ারে বসুন',
            onClick: () => {
              const chair = this.world.interactables.find((i) => i.id === 'mess_chair');
              if (chair) this.executeInteractable(chair);
            }
          },
          {
            id: 'act_switch',
            icon: '🔌',
            label: s.roomLightSwitchOn ? 'রুম সুইচ বন্ধ' : 'রুম সুইচ চালু',
            onClick: () => this.toggleRoomSwitch()
          }
        );
      }
    }

    if (inTong && zone) {
      const ownerId = zone.tongOwnerId ?? 'rafiq_mama';
      if (!this.player.isSitting) {
        actions.push({
          id: `act_sit_${zone.id}`,
          icon: '🪑',
          label: 'চেয়ারে বসুন',
          onClick: () => {
            const chair = this.world.interactables.find((i) => i.id === `${zone.id}_chair_1`);
            if (chair) this.executeInteractable(chair);
          }
        });
      }
      actions.push(
        {
          id: 'act_milk_tea',
          icon: '🍵',
          label: 'দুধ চা (১০৳)',
          primary: !s.hasTeaCup,
          onClick: () => this.orderTea('milk')
        },
        {
          id: 'act_red_tea',
          icon: '🫖',
          label: 'লাল চা (৫৳)',
          onClick: () => this.orderTea('red')
        },
        {
          id: 'act_buy_biscuit',
          icon: '🍪',
          label: 'বিস্কুট কিনুন (১০৳)',
          onClick: () => this.buyBiscuit()
        },
        {
          id: `act_talk_${ownerId}`,
          icon: '🗣️',
          label: 'দোকানদারের সাথে কথা',
          onClick: () => this.openNpcDialogue(ownerId)
        }
      );
    }

    if (s.hasTeaCup) {
      actions.push({
        id: 'act_drink_tea',
        icon: '☕',
        label: `চা পান করুন (${s.teaSipsLeft})`,
        primary: true,
        onClick: () => this.drinkTea()
      });
    }
    if (s.biscuits > 0 && !inMess) {
      actions.push({
        id: 'act_eat_biscuit',
        icon: '🍪',
        label: `বিস্কুট খান (${s.biscuits})`,
        onClick: () => this.eatBiscuit()
      });
    }

    // Nearest environmental prop or NPC button
    if (this.nearestInteractable && !this.player.isSitting) {
      const n = this.nearestInteractable;
      if (n.type === 'npc' && n.npcId) {
        const targetId = n.npcId;
        actions.push({
          id: `talk_${targetId}`,
          icon: n.icon,
          label: n.labelBn,
          primary: true,
          onClick: () => this.openNpcDialogue(targetId)
        });
      } else if (
        n.type === 'tubewell' ||
        n.type === 'notice_board' ||
        n.type === 'rickshaw_bell' ||
        n.type === 'outdoor_bench'
      ) {
        actions.push({
          id: `prop_${n.id}`,
          icon: n.icon,
          label: n.labelBn,
          primary: true,
          onClick: () => this.executeInteractable(n)
        });
      }
    }

    return actions;
  }

  // --- SIMULATION & AUTOMATIC ENVIRONMENTAL SYSTEMS ---

  private updateSimulation(dt: number, zone: NamedZone | null): void {
    const s = this.stateMgr.data;
    const inMess = Boolean(zone?.isMess);
    const isNight = this.stateMgr.isNight();

    // Update unified automatic Day-Night, Weather, and Load Shedding system
    this.env.update(dt, {
      onPowerChange: (powerOn: boolean) => {
        this.sound.playPowerSwitch(powerOn);
        if (!powerOn) {
          this.hud.showToast(
            '⚡ লোডশেডিং! বিদ্যুৎ চলে গেছে — কিছুক্ষণ পর স্বয়ংক্রিয়ভাবে ফিরে আসবে।',
            true
          );
        } else {
          this.hud.showToast('💡 বিদ্যুৎ স্বয়ংক্রিয়ভাবে ফিরে এসেছে! (Electricity Restored)');
        }
      },
      onWeatherChange: (next: WeatherType, prev: WeatherType) => {
        const meta = WEATHER_META[next];
        if (next === 'thunderstorm') {
          this.hud.showToast('⛈️ ঝড়-বৃষ্টি ও বজ্রপাত শুরু হয়েছে! (Thunderstorm)', true);
          this.sound.playThunder();
          this.env.lightningFlash = 1.0;
        } else if (next === 'heavy_rain') {
          this.hud.showToast('🌧️ ভারী বৃষ্টি নেমেছে! (Heavy Rain)');
        } else if (next === 'light_rain' && (prev === 'clear' || prev === 'cloudy')) {
          this.hud.showToast('🌦️ হালকা বৃষ্টি শুরু হয়েছে (Light Rain)');
        } else if (next === 'clear' && prev !== 'clear') {
          this.hud.showToast(`${meta.icon} আকাশ পরিষ্কার হয়ে আসছে (Weather Clearing)`);
        }
      },
      onThunderFlash: () => {
        this.sound.playThunder();
      }
    });

    // Ceiling fan smoothly coasts to a stop on outage & automatically restarts when power returns
    const fanShouldSpin = s.powerOn && s.ceilingFanSwitchOn;
    const targetRpm = fanShouldSpin ? 1 : 0;
    this.ceilingFanRpm = THREE.MathUtils.lerp(
      this.ceilingFanRpm,
      targetRpm,
      Math.min(1, dt * (fanShouldSpin ? 1.4 : 0.65))
    );
    this.world.ceilingFanRotor.rotation.y += this.ceilingFanRpm * dt * 11.5;

    // Emergency fan
    if (s.emergencyFanOn) {
      this.world.emergencyFanRotor.rotation.z -= dt * 24;
      s.emergencyFanBattery = Math.max(0, s.emergencyFanBattery - dt * 0.45);
      if (s.emergencyFanBattery <= 0) {
        s.emergencyFanOn = false;
        this.hud.showToast('🔋 চার্জার ফ্যানের চার্জ শেষ হয়ে গেছে!', true);
      }
    } else if (s.powerOn) {
      s.emergencyFanBattery = Math.min(100, s.emergencyFanBattery + dt * 1.4);
    }
    this.world.emergencyFanLed.emissiveIntensity = s.emergencyFanOn ? 1.8 : 0;

    // Mosquito coil
    if (s.mosquitoCoilLit) {
      s.mosquitoCoilTimer = Math.max(0, s.mosquitoCoilTimer - dt);
      if (s.mosquitoCoilTimer <= 0) {
        s.mosquitoCoilLit = false;
        this.hud.showToast('🦟 মশার কয়েল শেষ হয়ে গেছে!');
      }
    }
    this.world.coilEmberMat.emissiveIntensity = s.mosquitoCoilLit
      ? 1.5 + Math.sin(this.elapsed * 8) * 0.4
      : 0;
    this.world.coilSmokeGroup.visible = s.mosquitoCoilLit;
    if (s.mosquitoCoilLit) {
      this.world.coilSmokeGroup.children.forEach((puff, idx) => {
        const t = (this.elapsed * 0.65 + idx * 0.2) % 1;
        puff.position.y = t * 0.72;
        puff.position.x = Math.sin(this.elapsed * 2.5 + idx) * 0.04 * t;
        puff.scale.setScalar(0.6 + t * 1.1);
      });
    }

    // Power bank & phone
    if (s.phoneCharging) {
      if (s.powerBankBattery > 0 && s.phoneBattery < 100) {
        s.phoneBattery = Math.min(100, s.phoneBattery + dt * 2.2);
        s.powerBankBattery = Math.max(0, s.powerBankBattery - dt * 1.1);
      } else if (s.powerBankBattery <= 0) {
        s.phoneCharging = false;
        this.hud.showToast('🔋 পাওয়ার ব্যাংকের চার্জ শেষ!', true);
      }
    } else {
      s.phoneBattery = Math.max(5, s.phoneBattery - dt * 0.08);
      if (s.powerOn) {
        s.powerBankBattery = Math.min(100, s.powerBankBattery + dt * 1.2);
      }
    }
    this.world.powerBankLedMat.emissiveIntensity = s.phoneCharging ? 1.8 : 0;
    this.world.phoneScreenMat.emissiveIntensity = s.phoneCharging
      ? 0.9 + Math.sin(this.elapsed * 3) * 0.25
      : 0;

    // Temperature reacts naturally to time of day, weather, rain cooling, and load shedding
    let targetTemp = isNight ? 27.6 : this.stateMgr.getTimePhase() === 'day' ? 33.2 : 30.2;
    targetTemp -= this.env.rainIntensity * 3.4 + this.env.cloudiness * 1.0;
    if (inMess) {
      if (!s.powerOn) {
        targetTemp = s.emergencyFanOn ? 29.0 : Math.max(33.5, targetTemp + 4.8);
      } else if (s.ceilingFanSwitchOn) {
        targetTemp = Math.min(targetTemp, 26.8);
      } else {
        targetTemp += 2.2;
      }
    }
    s.temperature = THREE.MathUtils.lerp(s.temperature, targetTemp, Math.min(1, dt * 0.16));

    // Mosquitoes appear during nighttime/dark outages unless coil is lit
    const mosquitoesActive = !s.powerOn && !s.mosquitoCoilLit && (isNight || this.env.cloudiness > 0.5 || inMess);
    this.world.mosquitoGroup.visible = mosquitoesActive;
    if (mosquitoesActive) {
      this.world.mosquitoGroup.children.forEach((bug) => {
        const u = bug.userData;
        const t = this.elapsed * u.speed + u.phase;
        bug.position.set(
          u.baseX + Math.sin(t) * 0.55,
          u.baseY + Math.cos(t * 1.4) * 0.22,
          u.baseZ + Math.cos(t * 0.9) * 0.55
        );
      });
    }

    // Energy & Comfort dynamics (Rest & sleep quickly recharge; sprinting consumes faster)
    if (this.player.isSleeping) {
      s.energy = Math.min(100, s.energy + dt * 3.2);
      s.comfort = Math.min(100, s.comfort + dt * 2.4);
    } else if (this.player.isSitting) {
      s.energy = Math.min(100, s.energy + dt * 1.2);
      s.comfort = Math.min(100, s.comfort + dt * 0.5);
    } else {
      const burnRate =
        this.player.speedMode === 'sprint' ? 0.38 : this.player.speedMode === 'fast' ? 0.2 : 0.1;
      s.energy = Math.max(8, s.energy - dt * burnRate);
    }

    let comfortDelta = this.player.isSleeping ? 0.8 : 0.25;
    if (s.temperature > 32.5 && !this.player.isSleeping) comfortDelta -= 0.65;
    if (mosquitoesActive && inMess && !this.player.isSleeping) comfortDelta -= 0.85;
    if (!s.powerOn && isNight && inMess && !s.candleLit && !this.player.isSleeping)
      comfortDelta -= 0.35;
    if (s.candleLit && !s.powerOn && inMess) comfortDelta += 0.35;
    if (s.emergencyFanOn && inMess) comfortDelta += 0.55;
    if (this.env.rainIntensity > 0.65 && !inMess && !zone?.isTong) comfortDelta -= 0.3;
    s.comfort = THREE.MathUtils.clamp(s.comfort + comfortDelta * dt, 5, 100);

    // Periodic auto-save
    this.autoSaveTimer -= dt;
    if (this.autoSaveTimer <= 0) {
      this.syncPlayerToState();
      this.stateMgr.save();
      this.autoSaveTimer = 15;
    }

    // Update sound engine
    this.sound.update({
      dt,
      elapsed: this.elapsed,
      isNight,
      rainIntensity: this.env.rainIntensity,
      powerOn: s.powerOn,
      insideMess: inMess,
      nearTongOrCrowd: Boolean(zone?.isTong) || zone?.id === 'bottola_courtyard',
      ceilingFanRpm: this.ceilingFanRpm,
      emergencyFanOn: s.emergencyFanOn,
      mosquitoesActive
    });
  }

  private updateAtmosphereAndProps(dt: number): void {
    const s = this.stateMgr.data;
    const lighting = this.env.computeLighting(s.powerOn);

    // Apply smooth sky & fog
    (this.scene.background as THREE.Color).copy(this.env.skyColor);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.env.skyColor);
      this.scene.fog.density = lighting.fogDensity;
    }

    // Follow player XZ with directional sun shadow frustum so shadows stay crisp across entire expanded town
    const focusX = this.started ? this.player.position.x : 0;
    const focusZ = this.started ? this.player.position.z : 0;
    this.world.sunLight.target.position.set(focusX, 0, focusZ);
    this.world.sunLight.position.set(
      focusX + Math.cos(lighting.sunAngle) * 32,
      Math.max(8, lighting.sunElevation * 36),
      focusZ + 18
    );
    this.world.sunLight.intensity = lighting.sunIntensity;
    this.world.sunLight.color.setHex(lighting.sunColorHex);
    this.world.hemiLight.intensity = lighting.hemiIntensity;
    this.world.ambientLight.intensity = lighting.ambientIntensity;

    // Night stars
    (this.world.stars.material as THREE.PointsMaterial).opacity = lighting.starsOpacity;

    // Wet ground visual response during rain (smoothly glistening wet asphalt/bricks/courtyards)
    const wet = this.env.groundWetness;
    for (let i = 0; i < this.world.wettableMaterials.length; i++) {
      const wm = this.world.wettableMaterials[i];
      wm.mat.roughness = THREE.MathUtils.lerp(wm.dryRoughness, wm.wetRoughness, wet);
      wm.mat.color.copy(wm.dryColor).lerp(wm.wetColor, wet);
    }

    // Automatic house glowing windows (ON at night/dusk/heavy rain when power is ON; OFF on load shedding)
    const targetWinGlow = lighting.houseWindowsShouldGlow ? 1.15 : 0;
    this.world.houseWindowMat.emissiveIntensity = THREE.MathUtils.lerp(
      this.world.houseWindowMat.emissiveIntensity,
      targetWinGlow,
      Math.min(1, dt * 4)
    );

    // Mess Room lighting (Automatic at dusk/night/rain when switch & power are ON, dark on load shedding!)
    const roomBulbActive = s.powerOn && s.roomLightSwitchOn;
    this.world.roomLight.intensity = roomBulbActive ? 2.8 : 0;
    this.world.roomTubeMat.emissiveIntensity = roomBulbActive ? 1.5 : 0;

    // Flickering golden candle
    this.world.candleFlame.visible = s.candleLit;
    if (s.candleLit) {
      const flicker =
        1.0 + Math.sin(this.elapsed * 14) * 0.09 + Math.cos(this.elapsed * 23) * 0.06;
      this.world.candleLight.intensity = 2.7 * flicker;
      this.world.candleFlame.scale.set(
        0.95 + Math.sin(this.elapsed * 18) * 0.08,
        0.92 + Math.cos(this.elapsed * 15) * 0.14,
        0.95 + Math.sin(this.elapsed * 18) * 0.08
      );
    } else {
      this.world.candleLight.intensity = 0;
    }

    // Tong Dokans & Automatic Streetlights across the entire expanded neighborhood
    const tongBulbOn = lighting.streetLightsShouldGlow;
    for (const tl of this.world.tongLights) {
      tl.intensity = tongBulbOn ? 2.8 : 0;
    }
    for (const bm of this.world.tongBulbMats) {
      bm.emissiveIntensity = tongBulbOn ? 1.6 : 0;
    }
    const kupiGlow =
      !s.powerOn && (this.stateMgr.isNight() || lighting.duskFactor > 0.25)
        ? 1.45 + Math.sin(this.elapsed * 11) * 0.15
        : 0;
    for (const kl of this.world.tongKupiLights) {
      kl.intensity = kupiGlow;
    }

    for (const sl of this.world.streetLights) {
      sl.intensity = lighting.streetLightsShouldGlow ? 3.4 : 0;
    }
    for (const bm of this.world.streetBulbMats) {
      bm.emissiveIntensity = lighting.streetLightsShouldGlow ? 1.85 : 0;
    }

    // Kettle rising steam on all 3 Tong Dokans
    for (let g = 0; g < this.world.kettleSteamGroups.length; g++) {
      const grp = this.world.kettleSteamGroups[g];
      for (let idx = 0; idx < grp.children.length; idx++) {
        const puff = grp.children[idx];
        const p = (this.elapsed * 0.8 + idx * 0.25 + g * 0.3) % 1;
        puff.position.y = p * 0.68;
        puff.position.x = Math.sin(this.elapsed * 3 + idx) * 0.05 * p;
        puff.scale.setScalar(0.65 + p * 1.15);
      }
    }

    // Wind-responsive tree sway across the neighborhood
    const windMult = 0.85 + this.env.windStrength * 2.1;
    for (let i = 0; i < this.world.swayingTrees.length; i++) {
      const tObj = this.world.swayingTrees[i];
      tObj.obj.rotation.z =
        Math.sin(this.elapsed * 1.3 * windMult + tObj.phase) * tObj.amp * windMult;
      tObj.obj.rotation.x =
        Math.cos(this.elapsed * 0.9 * windMult + tObj.phase) * tObj.amp * 0.6 * windMult;
    }

    // Player-centered smooth rain streak particle system
    const rainAmt = this.env.rainIntensity;
    this.world.rainSystem.visible = rainAmt > 0.04;
    if (rainAmt > 0.04) {
      this.world.rainMat.opacity = Math.min(0.62, rainAmt * 0.58);
      this.world.rainSystem.position.set(focusX, 0, focusZ);
      const posAttr = this.world.rainSystem.geometry.getAttribute(
        'position'
      ) as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const fallSpeed = (16 + rainAmt * 14) * dt;
      const slant = 0.06 + this.env.windStrength * 0.16;
      for (let i = 0; i < arr.length; i += 6) {
        arr[i + 1] -= fallSpeed;
        arr[i + 4] = arr[i + 1] - (0.45 + rainAmt * 0.32);
        arr[i + 3] = arr[i] - slant;
        if (arr[i + 1] < 0) {
          const resetY = 16 + Math.random() * 4;
          arr[i + 1] = resetY;
          arr[i + 4] = resetY - 0.6;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  private loop(now: number): void {
    this.rafId = requestAnimationFrame((n) => this.loop(n));

    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    if (!this.paused) {
      this.elapsed += dt;
      const zone = this.getCurrentZone();
      const inMess = Boolean(zone?.isMess);

      if (this.started) {
        this.player.update(
          dt,
          this.world.colliders,
          this.world.bounds,
          this.camera,
          inMess,
          this.elapsed
        );
        this.updateSimulation(dt, zone);
      } else {
        // Scenic gently orbiting showcase camera over the expanded Bangladeshi town
        const a = this.elapsed * 0.11;
        this.camera.position.set(
          Math.sin(a) * 26,
          10.5 + Math.sin(a * 0.6) * 1.2,
          Math.cos(a) * 20 + 2
        );
        this.camera.lookAt(0, 2.0, -4.0);
      }

      this.npcs.update(dt, this.elapsed, {
        playerPos: this.player.position,
        colliders: this.world.colliders,
        bounds: this.world.bounds,
        isRaining: this.env.rainIntensity > 0.18,
        powerOn: this.stateMgr.data.powerOn,
        isNight: this.stateMgr.isNight()
      });

      this.traffic.update(dt, {
        playerPos: this.player.position,
        isNight: this.stateMgr.isNight(),
        isRaining: this.env.rainIntensity > 0.18,
        onHonk: (pitch) => this.sound.playVehicleHorn(pitch)
      });

      this.updateAtmosphereAndProps(dt);

      if (this.started) {
        this.nearestInteractable = this.findNearestInteractable();
        if (this.nearestInteractable && !this.player.isSitting && !this.player.isSleeping) {
          this.interactRing.visible = true;
          this.interactRing.position.set(
            this.nearestInteractable.position.x,
            0.16,
            this.nearestInteractable.position.z
          );
          this.interactRing.scale.setScalar(1 + Math.sin(this.elapsed * 5) * 0.1);
        } else {
          this.interactRing.visible = false;
        }

        const s = this.stateMgr.data;
        const isNight = this.stateMgr.isNight();
        const mosquitoesActive = !s.powerOn && !s.mosquitoCoilLit && inMess;

        this.hud.updateStats({
          state: s,
          formattedTime: this.stateMgr.formatTime(),
          timePhaseBn: this.stateMgr.getTimePhaseLabelBn(),
          isNight,
          locationLabel: this.getLocationLabel(zone),
          mosquitoesActive,
          muted: this.sound.muted
        });
        this.hud.updateInteractionPrompt(
          this.nearestInteractable,
          this.player.isSitting,
          this.player.isSleeping
        );
        this.hud.updateActionButtons(this.buildContextualActions(zone));

        if (this.fullMapOpen && this.selectedMapLocation && this.hud.isLocationDetailOpen()) {
          const dist = Math.hypot(
            this.player.position.x - this.selectedMapLocation.worldX,
            this.player.position.z - this.selectedMapLocation.worldZ
          );
          this.hud.updateLocationDistance(dist);
        }

        this.minimap.render({
          playerX: this.player.position.x,
          playerZ: this.player.position.z,
          playerYaw: this.player.facingYaw,
          npcs: this.npcs.npcs,
          vehicles: this.traffic.vehicles,
          powerOn: s.powerOn,
          isNight,
          fullMapOpen: this.fullMapOpen
        });
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
