import * as THREE from 'three';
import { BoxCollider, Interactable, SaveData, WorldBounds } from '../types';
import { getSurfaceHeight } from '../world/WorldPhysics';
import {
  DIALOGUE_TOPICS,
  getGenericBanglaDialogue,
  NPC_DIALOGUE_DATABASE
} from './DialogueData';

export type NPCBehavior = 'shopkeeper' | 'seated_tea' | 'seated_home' | 'talking' | 'walker';

export interface NPCEntity {
  id: string;
  nameBn: string;
  roleBn: string;
  avatar: string;
  behavior: NPCBehavior;
  mesh: THREE.Group;
  position: THREE.Vector3;
  yaw: number;
  baseSpeed: number;
  isSeated: boolean;
  // Walker graph navigation state
  currentNode: number;
  targetNode: number;
  pauseTimer: number;
  // Articulated parts
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  head: THREE.Group;
  umbrella?: THREE.Group;
  walkPhase: number;
  animAccum: number;
  interactable?: Interactable;
}

interface StreetNode {
  x: number;
  z: number;
  neighbors: number[];
}

// Connected sidewalk / street graph matching exact clear road coordinates across town and bridges
const STREET_GRAPH: StreetNode[] = [
  // --- Main Bazar Road (z = 2.8) ---
  /* 0 */ { x: -66, z: 2.8, neighbors: [1, 45] },
  /* 1 */ { x: -54, z: 2.8, neighbors: [0, 2, 10, 15] }, // West Ave crossing
  /* 2 */ { x: -42, z: 2.8, neighbors: [1, 3] },        // Kashem's Tong
  /* 3 */ { x: -26, z: 2.8, neighbors: [2, 4, 11, 16] },// West Mess Road
  /* 4 */ { x: -10, z: 2.8, neighbors: [3, 5] },        // Mess Alley
  /* 5 */ { x: 0, z: 2.8, neighbors: [4, 6, 12, 17] },  // Central Goli
  /* 6 */ { x: 26, z: 2.8, neighbors: [5, 7, 13, 18] }, // East Bazar Road
  /* 7 */ { x: 42, z: 2.8, neighbors: [6, 8] },         // Restaurant Junction
  /* 8 */ { x: 54, z: 2.8, neighbors: [7, 9, 14, 19] }, // East Ave / Bridge Approach
  /* 9 */ { x: 63, z: 2.8, neighbors: [8, 30] },        // Concrete Bridge Deck Apex

  // --- North Cross Street (z = -20.0) ---
  /* 10 */ { x: -54, z: -20.0, neighbors: [1, 11, 20] },
  /* 11 */ { x: -26, z: -20.0, neighbors: [3, 10, 12, 21] },
  /* 12 */ { x: 0, z: -20.0, neighbors: [5, 11, 13, 22] },
  /* 13 */ { x: 26, z: -20.0, neighbors: [6, 12, 14, 23] },
  /* 14 */ { x: 54, z: -20.0, neighbors: [8, 13, 24, 39] },

  // --- South Residential Road (z = 24.0) ---
  /* 15 */ { x: -54, z: 24.0, neighbors: [1, 16, 25] },
  /* 16 */ { x: -26, z: 24.0, neighbors: [3, 15, 17, 26] },
  /* 17 */ { x: 0, z: 24.0, neighbors: [5, 16, 18, 27] },
  /* 18 */ { x: 26, z: 24.0, neighbors: [6, 17, 19, 28] },
  /* 19 */ { x: 54, z: 24.0, neighbors: [8, 18, 29, 40] },

  // --- Far North Lane (z = -46.0) ---
  /* 20 */ { x: -54, z: -46.0, neighbors: [10, 21] },
  /* 21 */ { x: -26, z: -46.0, neighbors: [11, 20, 22] },
  /* 22 */ { x: 0, z: -46.0, neighbors: [12, 21, 23] },
  /* 23 */ { x: 26, z: -46.0, neighbors: [13, 22, 24] },
  /* 24 */ { x: 54, z: -46.0, neighbors: [14, 23, 39, 41] },

  // --- Far South Colony Road (z = 46.0) ---
  /* 25 */ { x: -54, z: 46.0, neighbors: [15, 26] },
  /* 26 */ { x: -26, z: 46.0, neighbors: [16, 25, 27] },
  /* 27 */ { x: 0, z: 46.0, neighbors: [17, 26, 28] },
  /* 28 */ { x: 26, z: 46.0, neighbors: [18, 27, 29] },
  /* 29 */ { x: 54, z: 46.0, neighbors: [19, 28, 40] },

  // --- East Riverside District & Bridge Network ---
  /* 30 */ { x: 78, z: 2.8, neighbors: [9, 31, 32, 33] },   // Concrete Bridge East Landing
  /* 31 */ { x: 81.5, z: -10.0, neighbors: [30, 34] },      // River Ghat Promenade
  /* 32 */ { x: 81.5, z: 20.0, neighbors: [30, 35, 36] },   // Cricket Ground Promenade
  /* 33 */ { x: 93.0, z: 2.8, neighbors: [30, 36] },        // East Main Road
  /* 34 */ { x: 81.5, z: -36.0, neighbors: [31, 37, 44] },  // Bamboo Footbridge East Landing
  /* 35 */ { x: 81.5, z: 39.2, neighbors: [32, 36, 38] },   // South Culvert East Landing
  /* 36 */ { x: 93.0, z: 20.0, neighbors: [32, 33, 35] },   // Cricket Pavilion & Field
  /* 37 */ { x: 62.0, z: -36.0, neighbors: [34, 39] },      // Bamboo Footbridge Center
  /* 38 */ { x: 63.0, z: 39.2, neighbors: [35, 40] },       // South Culvert Center
  /* 39 */ { x: 54.0, z: -36.0, neighbors: [37, 14, 24] },  // Bamboo Footbridge West Landing
  /* 40 */ { x: 54.0, z: 39.2, neighbors: [38, 19, 29] },   // South Culvert West Landing

  // --- North Steel Truss Bridge & Extensions (NEW) ---
  /* 41 */ { x: 54.0, z: -68.0, neighbors: [24, 42] },      // Truss Bridge West Landing
  /* 42 */ { x: 63.0, z: -68.0, neighbors: [41, 43] },      // Truss Bridge Apex
  /* 43 */ { x: 78.0, z: -68.0, neighbors: [42, 44] },      // Truss Bridge East Landing
  /* 44 */ { x: 81.5, z: -68.0, neighbors: [43, 34] },      // East Promenade North
  /* 45 */ { x: -85.0, z: 2.8, neighbors: [0] }             // West Para Extension
];

export class NPCManager {
  public readonly npcs: NPCEntity[] = [];

  // Shared geometries across all 18 NPCs for optimal GPU memory & performance
  private readonly torsoGeo = new THREE.BoxGeometry(0.44, 0.56, 0.24);
  private readonly headGeo = new THREE.BoxGeometry(0.27, 0.29, 0.27);
  private readonly hairGeo = new THREE.BoxGeometry(0.29, 0.11, 0.29);
  private readonly eyeGeo = new THREE.BoxGeometry(0.035, 0.035, 0.02);
  private readonly armGeo = new THREE.BoxGeometry(0.12, 0.5, 0.13);
  private readonly legGeo = new THREE.BoxGeometry(0.16, 0.68, 0.17);
  private readonly gamchaGeo = new THREE.BoxGeometry(0.11, 0.44, 0.27);
  private readonly cupGeo = new THREE.CylinderGeometry(0.036, 0.03, 0.08, 7);
  private readonly umbrellaTopGeo = new THREE.ConeGeometry(0.58, 0.2, 8);
  private readonly umbrellaPoleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.72, 5);
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
  private readonly cupMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.35 });
  private readonly gamchaMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.9 });

  constructor(scene: THREE.Scene, interactables: Interactable[]) {
    // --- 1. SHOPKEEPERS (5) ---
    this.addNPC(scene, interactables, {
      id: 'rafiq_mama',
      nameBn: 'রফিক মামা',
      roleBn: "মামা'র টং দোকানদার • Tea Stall Owner",
      avatar: '🍵',
      behavior: 'shopkeeper',
      x: 9.8,
      z: -3.5,
      yaw: 0,
      shirtColor: 0xe2e8f0,
      lowerColor: 0x0f766e,
      skinColor: 0xb97a48,
      hasGamcha: true,
      addDirectInteractable: false
    });

    this.addNPC(scene, interactables, {
      id: 'haji_chacha',
      nameBn: 'হাজী চাচা',
      roleBn: 'পূর্ব বাজার টং দোকানদার • East Bazar Tea Seller',
      avatar: '🫖',
      behavior: 'shopkeeper',
      x: 33.8,
      z: -3.7,
      yaw: 0,
      shirtColor: 0xfef9c3,
      lowerColor: 0x1e40af,
      skinColor: 0xb57644,
      hasGamcha: true,
      addDirectInteractable: false
    });

    this.addNPC(scene, interactables, {
      id: 'jasim_bhai',
      nameBn: 'জসিম ভাই',
      roleBn: 'বটতলা টং দোকানদার • Pan & Tea Seller',
      avatar: '☕',
      behavior: 'shopkeeper',
      x: 18.8,
      z: 9.7,
      yaw: Math.PI,
      shirtColor: 0x38bdf8,
      lowerColor: 0x334155,
      skinColor: 0xc28550,
      hasGamcha: true,
      addDirectInteractable: false
    });

    this.addNPC(scene, interactables, {
      id: 'majid_mia',
      nameBn: 'মজিদ মিয়া',
      roleBn: 'আল-আমিন মুদি দোকানদার • Grocery Shopkeeper',
      avatar: '🛒',
      behavior: 'shopkeeper',
      x: -31.8,
      z: 11.5,
      yaw: Math.PI / 2,
      shirtColor: 0xfde68a,
      lowerColor: 0x065f46,
      skinColor: 0xb67746,
      addDirectInteractable: true
    });

    this.addNPC(scene, interactables, {
      id: 'kashem_bhai',
      nameBn: 'কাশেম ভাই',
      roleBn: 'পশ্চিম পাড়া টং দোকানদার • Kashem Tong Owner',
      avatar: '🍵',
      behavior: 'shopkeeper',
      x: -42.2,
      z: -3.5,
      yaw: 0,
      shirtColor: 0x9a3412,
      lowerColor: 0x1e3a8a,
      skinColor: 0xba7b4a,
      hasGamcha: true,
      addDirectInteractable: false
    });

    this.addNPC(scene, interactables, {
      id: 'bareq_mama',
      nameBn: 'বারেক মামা',
      roleBn: 'নদীর পাড়ের টং দোকানদার • Riverbank Tea Stall Owner',
      avatar: '🍵',
      behavior: 'shopkeeper',
      x: 87.0,
      z: 5.8,
      yaw: 0,
      shirtColor: 0x0284c7,
      lowerColor: 0x047857,
      skinColor: 0xc1804c,
      hasGamcha: true,
      addDirectInteractable: false
    });

    // --- 2. SEATED AT TEA STALLS & OUTSIDE HOMES (5) ---
    this.addNPC(scene, interactables, {
      id: 'kabir_bhai',
      nameBn: 'কবির ভাই',
      roleBn: 'টং দোকানে চা খাচ্ছেন • Regular at Tong',
      avatar: '🧔',
      behavior: 'seated_tea',
      x: 11.75,
      z: -1.45,
      yaw: Math.PI - 0.2,
      shirtColor: 0x92400e,
      lowerColor: 0x1e293b,
      skinColor: 0xb97a48,
      isSeated: true,
      hasCup: true,
      addDirectInteractable: true
    });

    this.addNPC(scene, interactables, {
      id: 'faruk_bhai',
      nameBn: 'ফারুক ভাই',
      roleBn: 'পূর্ব বাজারে চা পান করছেন • Drinking Tea',
      avatar: '👨',
      behavior: 'seated_tea',
      x: 35.75,
      z: -1.65,
      yaw: Math.PI - 0.15,
      shirtColor: 0x4338ca,
      lowerColor: 0x1f2937,
      skinColor: 0xc58854,
      isSeated: true,
      hasCup: true,
      addDirectInteractable: true
    });

    this.addNPC(scene, interactables, {
      id: 'sabbir',
      nameBn: 'সাব্বির',
      roleBn: 'বটতলা চত্বরে বসে আছেন • Local Student',
      avatar: '🧑',
      behavior: 'seated_home',
      x: -10.5,
      z: 14.0,
      yaw: Math.PI / 2,
      shirtColor: 0x059669,
      lowerColor: 0x0f172a,
      skinColor: 0xc88d5b,
      isSeated: true,
      addDirectInteractable: true
    });

    this.addNPC(scene, interactables, {
      id: 'nazma_khala',
      nameBn: 'নাজমা খালা',
      roleBn: 'বাড়ির সামনে বসে আছেন • Neighborhood Resident',
      avatar: '👩',
      behavior: 'seated_home',
      x: -17.6,
      z: 7.2,
      yaw: Math.PI,
      shirtColor: 0xdb2777,
      lowerColor: 0x9d174d,
      skinColor: 0xcb8e5c,
      isSeated: true,
      addDirectInteractable: true
    });

    this.addNPC(scene, interactables, {
      id: 'rahim_chacha',
      nameBn: 'রহিম চাচা',
      roleBn: 'অরুণোদয় মেসের তত্ত্বাবধায়ক • Mess Manager',
      avatar: '👴',
      behavior: 'seated_home',
      x: -11.0,
      z: -26.5,
      yaw: 0,
      shirtColor: 0xf1f5f9,
      lowerColor: 0x047857,
      skinColor: 0xb17242,
      isSeated: true,
      addDirectInteractable: true
    });

    // --- 3. STANDING & TALKING GROUPS (3) ---
    this.addNPC(scene, interactables, {
      id: 'sohel',
      nameBn: 'সোহেল (রুমমেট)',
      roleBn: 'সবুজ মেসের বন্ধু • Mess Roommate',
      avatar: '🎓',
      behavior: 'talking',
      x: -7.8,
      z: -5.2,
      yaw: -0.5,
      shirtColor: 0x2563eb,
      lowerColor: 0x334155,
      skinColor: 0xc48652,
      addDirectInteractable: true
    });

    this.addNPC(scene, interactables, {
      id: 'tanvir',
      nameBn: 'তানভীর',
      roleBn: 'বন্ধুদের সাথে আড্ডা দিচ্ছেন • Chatting',
      avatar: '🧑',
      behavior: 'talking',
      x: -6.8,
      z: 11.4,
      yaw: 1.4,
      shirtColor: 0xd97706,
      lowerColor: 0x1e293b,
      skinColor: 0xc38450,
      addDirectInteractable: true
    });

    this.addNPC(scene, interactables, {
      id: 'rifat',
      nameBn: 'রিফাত',
      roleBn: 'পাড়ার বন্ধু • Chatting in Courtyard',
      avatar: '🧑',
      behavior: 'talking',
      x: -5.5,
      z: 11.5,
      yaw: -1.5,
      shirtColor: 0x7c3aed,
      lowerColor: 0x1e293b,
      skinColor: 0xbe7e4c,
      addDirectInteractable: true
    });

    // --- 4. CONNECTED ROAD & ALLEY WALKERS ---
    const walkers: {
      id: string;
      nameBn: string;
      roleBn: string;
      avatar: string;
      startNode: number;
      nextNode: number;
      speed: number;
      shirt: number;
      lower: number;
      skin: number;
      umbrellaColor: number;
    }[] = [
      {
        id: 'abul_chacha',
        nameBn: 'আবুল চাচা',
        roleBn: 'রাস্তায় হাঁটছেন • Local Elder',
        avatar: '👴',
        startNode: 2,
        nextNode: 3,
        speed: 1.15,
        shirt: 0xfef3c7,
        lower: 0x475569,
        skin: 0xb77848,
        umbrellaColor: 0x1e293b
      },
      {
        id: 'sumon',
        nameBn: 'সুমন',
        roleBn: 'বাজারের দিকে যাচ্ছেন • Neighborhood Youth',
        avatar: '🚶',
        startNode: 4,
        nextNode: 5,
        speed: 1.55,
        shirt: 0x0d9488,
        lower: 0x0f172a,
        skin: 0xc68956,
        umbrellaColor: 0x1d4ed8
      },
      {
        id: 'mina_apa',
        nameBn: 'মীনা আপা',
        roleBn: 'দোকান থেকে ফিরছেন • Resident',
        avatar: '👩',
        startNode: 1,
        nextNode: 10,
        speed: 1.32,
        shirt: 0xe11d48,
        lower: 0xf59e0b,
        skin: 0xce9462,
        umbrellaColor: 0xbe185d
      },
      {
        id: 'karim_mia',
        nameBn: 'করিম মিয়া',
        roleBn: 'পাড়ার বাসিন্দা • Walking Neighbor',
        avatar: '🧔',
        startNode: 12,
        nextNode: 22,
        speed: 1.28,
        shirt: 0x65a30d,
        lower: 0x1e3a8a,
        skin: 0xb47444,
        umbrellaColor: 0x065f46
      },
      {
        id: 'naeem',
        nameBn: 'নাঈম',
        roleBn: 'মেস ছাত্র • College Student',
        avatar: '🎓',
        startNode: 17,
        nextNode: 27,
        speed: 1.62,
        shirt: 0x0284c7,
        lower: 0x1f2937,
        skin: 0xc88c59,
        umbrellaColor: 0x334155
      },
      {
        id: 'rubina_apa',
        nameBn: 'রুবিনা আপা',
        roleBn: 'দক্ষিণ পাড়ার বাসিন্দা • Resident',
        avatar: '👩',
        startNode: 18,
        nextNode: 17,
        speed: 1.25,
        shirt: 0x9333ea,
        lower: 0x4c1d95,
        skin: 0xcc905e,
        umbrellaColor: 0x7c3aed
      },
      {
        id: 'tamim',
        nameBn: 'তামীম',
        roleBn: 'পূর্ব বাজারে হাঁটছেন • College Student',
        avatar: '🚶',
        startNode: 8,
        nextNode: 14,
        speed: 1.48,
        shirt: 0x059669,
        lower: 0x1e293b,
        skin: 0xca8c58,
        umbrellaColor: 0x047857
      },
      {
        id: 'shahed_bhai',
        nameBn: 'শাহেদ ভাই',
        roleBn: 'উত্তর লেন ধরে হাঁটছেন • Resident',
        avatar: '🧔',
        startNode: 21,
        nextNode: 11,
        speed: 1.35,
        shirt: 0xf59e0b,
        lower: 0x334155,
        skin: 0xc0804e,
        umbrellaColor: 0xd97706
      }
    ];

    for (const w of walkers) {
      const start = STREET_GRAPH[w.startNode];
      this.addNPC(scene, interactables, {
        id: w.id,
        nameBn: w.nameBn,
        roleBn: w.roleBn,
        avatar: w.avatar,
        behavior: 'walker',
        x: start.x,
        z: start.z,
        yaw: 0,
        shirtColor: w.shirt,
        lowerColor: w.lower,
        skinColor: w.skin,
        baseSpeed: w.speed,
        startNode: w.startNode,
        nextNode: w.nextNode,
        umbrellaColor: w.umbrellaColor,
        addDirectInteractable: true
      });
    }
  }

  private addNPC(
    scene: THREE.Scene,
    interactables: Interactable[],
    cfg: {
      id: string;
      nameBn: string;
      roleBn: string;
      avatar: string;
      behavior: NPCBehavior;
      x: number;
      z: number;
      yaw: number;
      shirtColor: number;
      lowerColor: number;
      skinColor: number;
      hasGamcha?: boolean;
      hasCup?: boolean;
      isSeated?: boolean;
      baseSpeed?: number;
      startNode?: number;
      nextNode?: number;
      umbrellaColor?: number;
      addDirectInteractable: boolean;
    }
  ): void {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: cfg.skinColor, roughness: 0.75 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, roughness: 0.9 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: cfg.shirtColor, roughness: 0.85 });
    const lowerMat = new THREE.MeshStandardMaterial({ color: cfg.lowerColor, roughness: 0.88 });

    const body = new THREE.Group();
    if (cfg.isSeated) body.position.y = -0.28;
    group.add(body);

    const torso = new THREE.Mesh(this.torsoGeo, shirtMat);
    torso.position.y = 1.04;
    torso.castShadow = true;
    body.add(torso);

    if (cfg.hasGamcha) {
      const gamcha = new THREE.Mesh(this.gamchaGeo, this.gamchaMat);
      gamcha.position.set(0.14, 1.12, 0);
      body.add(gamcha);
    }

    const head = new THREE.Group();
    head.position.set(0, 1.46, 0);
    const skull = new THREE.Mesh(this.headGeo, skinMat);
    skull.castShadow = true;
    const hair = new THREE.Mesh(this.hairGeo, hairMat);
    hair.position.set(0, 0.12, -0.01);
    const e1 = new THREE.Mesh(this.eyeGeo, this.eyeMat);
    e1.position.set(-0.055, 0.02, 0.138);
    const e2 = new THREE.Mesh(this.eyeGeo, this.eyeMat);
    e2.position.set(0.055, 0.02, 0.138);
    head.add(skull, hair, e1, e2);
    body.add(head);

    const makeArm = (x: number, withCup = false) => {
      const p = new THREE.Group();
      p.position.set(x, 1.29, 0);
      const a = new THREE.Mesh(this.armGeo, shirtMat);
      a.position.y = -0.24;
      a.castShadow = true;
      p.add(a);
      if (withCup) {
        const cup = new THREE.Mesh(this.cupGeo, this.cupMat);
        cup.position.set(0, -0.5, 0.06);
        p.add(cup);
      }
      return p;
    };
    const leftArm = makeArm(-0.28, false);
    const rightArm = makeArm(0.28, cfg.hasCup);
    body.add(leftArm, rightArm);

    let umbrella: THREE.Group | undefined;
    if (cfg.behavior === 'walker') {
      umbrella = new THREE.Group();
      umbrella.position.set(0.18, 1.56, 0.14);
      const pole = new THREE.Mesh(
        this.umbrellaPoleGeo,
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      pole.position.y = 0.25;
      const canopy = new THREE.Mesh(
        this.umbrellaTopGeo,
        new THREE.MeshStandardMaterial({ color: cfg.umbrellaColor ?? 0x1e293b, roughness: 0.7 })
      );
      canopy.position.y = 0.62;
      umbrella.add(pole, canopy);
      umbrella.visible = false;
      body.add(umbrella);
    }

    const makeLeg = (x: number) => {
      const p = new THREE.Group();
      p.position.set(x, 0.74, 0);
      const l = new THREE.Mesh(this.legGeo, lowerMat);
      l.position.y = -0.34;
      l.castShadow = true;
      p.add(l);
      if (cfg.isSeated) p.rotation.x = -Math.PI * 0.48;
      return p;
    };
    const leftLeg = makeLeg(-0.11);
    const rightLeg = makeLeg(0.11);
    body.add(leftLeg, rightLeg);

    const pos = new THREE.Vector3(cfg.x, 0.06, cfg.z);
    group.position.copy(pos);
    group.rotation.y = cfg.yaw;
    scene.add(group);

    let interactable: Interactable | undefined;
    if (cfg.addDirectInteractable) {
      interactable = {
        id: `npc_${cfg.id}`,
        type: 'npc',
        labelBn: `${cfg.nameBn}-এর সাথে কথা বলুন`,
        labelEn: `Talk to ${cfg.nameBn}`,
        icon: cfg.avatar,
        position: pos,
        radius: 2.35,
        npcId: cfg.id
      };
      interactables.push(interactable);
    }

    this.npcs.push({
      id: cfg.id,
      nameBn: cfg.nameBn,
      roleBn: cfg.roleBn,
      avatar: cfg.avatar,
      behavior: cfg.behavior,
      mesh: group,
      position: pos,
      yaw: cfg.yaw,
      baseSpeed: cfg.baseSpeed ?? 1.3,
      isSeated: Boolean(cfg.isSeated),
      currentNode: cfg.startNode ?? 0,
      targetNode: cfg.nextNode ?? 1,
      pauseTimer: 0,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      head,
      umbrella,
      walkPhase: Math.random() * 6.28,
      animAccum: 0,
      interactable
    });
  }

  public getById(id: string): NPCEntity | undefined {
    return this.npcs.find((n) => n.id === id);
  }

  public getDialogue(npcId: string, state: SaveData, isNight: boolean): string {
    const isRain =
      state.weather === 'light_rain' ||
      state.weather === 'heavy_rain' ||
      state.weather === 'thunderstorm';

    const p = NPC_DIALOGUE_DATABASE[npcId];
    if (p) {
      return p.defaultGreeting(state, isNight, isRain);
    }

    if (isRain) {
      return 'উফ! ঝুম বৃষ্টি শুরু হয়ে গেছে, ছাতা মাথায় দিয়ে সাবধানে হাঁটছি। তুমিও বৃষ্টিতে ভিজে ঠান্ডা লাগিও না ভাই!';
    }
    if (!state.powerOn && isNight) {
      return 'লোডশেডিংয়ের রাতে রাস্তাটা একটু অন্ধকার হয়ে গেছে, সাবধানে দেখেশুনে চলাচল করো ভাই!';
    }
    if (!state.powerOn) {
      return 'কারেন্ট চলে গেছে ভাই, তাই পাড়ার নির্মল খোলা বাতাসে হাঁটছি। একটু পরই বিদ্যুৎ চলে আসবে!';
    }
    return 'আসসালামু আলাইকুম! আমাদের পাড়াটা এখন কত শান্ত আর সুন্দর। সময় পেলে রফিক মামা বা নদীর পাড়ের বারেক মামার টংয়ে ঘুরে এসো!';
  }

  public getTopicResponse(
    npcId: string,
    topicId: string,
    state: SaveData,
    isNight: boolean
  ): { text: string; comfort: number; energy: number } {
    const isRain =
      state.weather === 'light_rain' ||
      state.weather === 'heavy_rain' ||
      state.weather === 'thunderstorm';

    const topic = DIALOGUE_TOPICS.find((t) => t.id === topicId);
    const comfort = topic?.comfortReward ?? 10;
    const energy = topic?.energyReward ?? 5;

    const p = NPC_DIALOGUE_DATABASE[npcId];
    if (p && p.topicResponses[topicId]) {
      const variants = p.topicResponses[topicId](state, isNight, isRain);
      if (variants && variants.length > 0) {
        const text = variants[Math.floor(Math.random() * variants.length)];
        return { text, comfort, energy };
      }
    }

    // Generic fallback for any other NPC/pedestrian
    const genericText = getGenericBanglaDialogue(topicId, state, isNight, isRain);
    return { text: genericText, comfort, energy };
  }

  public update(
    dt: number,
    elapsed: number,
    params: {
      playerPos: THREE.Vector3;
      colliders: BoxCollider[];
      bounds: WorldBounds;
      isRaining: boolean;
      powerOn: boolean;
      isNight: boolean;
    }
  ): void {
    const { playerPos, colliders, bounds, isRaining, powerOn, isNight } = params;
    const npcCount = this.npcs.length;

    for (let i = 0; i < npcCount; i++) {
      const npc = this.npcs[i];
      const distSqToPlayer =
        (npc.position.x - playerPos.x) * (npc.position.x - playerPos.x) +
        (npc.position.z - playerPos.z) * (npc.position.z - playerPos.z);

      // Show umbrella for walking NPCs during rain!
      if (npc.umbrella) {
        npc.umbrella.visible = isRaining;
      }

      if (npc.behavior === 'walker') {
        this.updateWalker(npc, dt, i, playerPos, colliders, bounds, isRaining, powerOn, isNight);
      }

      // Distance-based animation optimization (full 60fps within 26m, ~18Hz further away)
      const isNear = distSqToPlayer < 26 * 26;
      npc.animAccum += dt;
      if (!isNear && npc.animAccum < 0.055) continue;
      const stepDt = npc.animAccum;
      npc.animAccum = 0;

      if (npc.behavior === 'walker') {
        const walking = npc.pauseTimer <= 0;
        if (walking) {
          const speedMult = isRaining ? 1.35 : !powerOn && isNight ? 0.82 : 1.0;
          npc.walkPhase += stepDt * 5.8 * speedMult;
          const sw = Math.sin(npc.walkPhase) * 0.48;
          npc.leftLeg.rotation.x = sw;
          npc.rightLeg.rotation.x = -sw;
          npc.leftArm.rotation.x = -sw * 0.72;
          npc.rightArm.rotation.x = isRaining ? -1.45 : sw * 0.72;
        } else {
          npc.leftLeg.rotation.x *= 0.82;
          npc.rightLeg.rotation.x *= 0.82;
          npc.leftArm.rotation.x *= 0.82;
          npc.rightArm.rotation.x = isRaining ? -1.45 : npc.rightArm.rotation.x * 0.82;
          npc.head.rotation.y = Math.sin(elapsed * 1.4 + npc.walkPhase) * 0.25;
        }
      } else if (npc.behavior === 'seated_tea') {
        // Sip tea periodically, or fan themselves during load shedding
        npc.head.rotation.y = Math.sin(elapsed * 0.8 + npc.walkPhase) * 0.16;
        if (!powerOn) {
          npc.leftArm.rotation.x = -0.95 + Math.sin(elapsed * 8 + npc.walkPhase) * 0.25;
        } else {
          npc.leftArm.rotation.x = -0.25;
        }
        const sipCycle = Math.sin(elapsed * 0.7 + npc.walkPhase);
        npc.rightArm.rotation.x = sipCycle > 0.65 ? -1.35 : -0.45;
      } else if (npc.behavior === 'talking') {
        // Expressive conversation gestures
        npc.head.rotation.y = Math.sin(elapsed * 1.6 + npc.walkPhase) * 0.2;
        npc.rightArm.rotation.x = -0.35 + Math.sin(elapsed * 3.1 + npc.walkPhase) * 0.22;
        npc.leftArm.rotation.x = !powerOn
          ? -0.9 + Math.sin(elapsed * 7.5 + npc.walkPhase) * 0.22
          : Math.cos(elapsed * 2.2 + npc.walkPhase) * 0.14;
      } else {
        // Shopkeepers & seated outdoor residents
        npc.head.rotation.y = Math.sin(elapsed * 0.9 + npc.walkPhase) * 0.15;
        npc.rightArm.rotation.x = !powerOn
          ? -0.95 + Math.sin(elapsed * 7.8 + npc.walkPhase) * 0.24
          : Math.sin(elapsed * 1.6 + npc.walkPhase) * 0.14;
      }
    }
  }

  private updateWalker(
    npc: NPCEntity,
    dt: number,
    index: number,
    playerPos: THREE.Vector3,
    colliders: BoxCollider[],
    bounds: WorldBounds,
    isRaining: boolean,
    powerOn: boolean,
    isNight: boolean
  ): void {
    if (npc.pauseTimer > 0) {
      npc.pauseTimer -= dt;
      return;
    }

    const target = STREET_GRAPH[npc.targetNode];
    const dx = target.x - npc.position.x;
    const dz = target.z - npc.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.75) {
      const prevNode = npc.currentNode;
      npc.currentNode = npc.targetNode;
      const choices = STREET_GRAPH[npc.currentNode].neighbors;
      // Prefer continuing forward rather than immediately reversing unless dead-end
      const forwardChoices = choices.filter((n) => n !== prevNode);
      const pool = forwardChoices.length > 0 ? forwardChoices : choices;
      npc.targetNode = pool[Math.floor(Math.random() * pool.length)];

      // Occasional believable stop at street corner (rare in heavy rain)
      if (!isRaining && Math.random() < 0.28) {
        npc.pauseTimer = 1.5 + Math.random() * 2.5;
      }
      return;
    }

    // Desired direction toward next street waypoint
    let dirX = dx / dist;
    let dirZ = dz / dist;

    // Smooth pairwise separation from other NPCs & Player (prevents overlapping!)
    const sepRadius = 1.05;
    for (let j = 0; j < this.npcs.length; j++) {
      if (j === index) continue;
      const other = this.npcs[j];
      const ox = npc.position.x - other.position.x;
      const oz = npc.position.z - other.position.z;
      const od = Math.hypot(ox, oz);
      if (od > 0.001 && od < sepRadius) {
        const push = (sepRadius - od) / sepRadius;
        dirX += (ox / od) * push * 1.4;
        dirZ += (oz / od) * push * 1.4;
      }
    }

    const px = npc.position.x - playerPos.x;
    const pz = npc.position.z - playerPos.z;
    const pd = Math.hypot(px, pz);
    if (pd > 0.001 && pd < 1.15) {
      const push = (1.15 - pd) / 1.15;
      dirX += (px / pd) * push * 1.6;
      dirZ += (pz / pd) * push * 1.6;
    }

    const len = Math.hypot(dirX, dirZ) || 1;
    dirX /= len;
    dirZ /= len;

    const speedMult = isRaining ? 1.38 : !powerOn && isNight ? 0.82 : 1.0;
    const speed = npc.baseSpeed * speedMult;

    const candX = THREE.MathUtils.clamp(
      npc.position.x + dirX * speed * dt,
      bounds.minX + 1.0,
      bounds.maxX - 1.0
    );
    const candZ = THREE.MathUtils.clamp(
      npc.position.z + dirZ * speed * dt,
      bounds.minZ + 1.0,
      bounds.maxZ - 1.0
    );

    // Axis-separated building/prop collider check (never walks through walls/furniture!)
    const r = 0.36;
    if (!this.collides(candX, npc.position.z, r, colliders)) {
      npc.position.x = candX;
    }
    if (!this.collides(npc.position.x, candZ, r, colliders)) {
      npc.position.z = candZ;
    }
    // Dynamic surface elevation (smoothly climbs bridges and stairs!)
    npc.position.y = getSurfaceHeight(npc.position.x, npc.position.z) + 0.02;

    // Smooth yaw turn
    const desiredYaw = Math.atan2(dirX, dirZ);
    let diff = desiredYaw - npc.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    npc.yaw += diff * Math.min(1, dt * 8);

    npc.mesh.position.copy(npc.position);
    npc.mesh.rotation.y = npc.yaw;
  }

  private collides(x: number, z: number, r: number, colliders: BoxCollider[]): boolean {
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        return true;
      }
    }
    return false;
  }
}
