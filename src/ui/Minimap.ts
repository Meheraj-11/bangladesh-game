import { MapBuilding, MapLocationDetail, MapTree, RoadRect, VehicleEntity, WorldBounds } from '../types';
import { NPCEntity } from '../npc/NPCManager';

/**
 * Top-Left Circular Rotating Minimap + Interactive Expandable Full Neighborhood Map
 *
 * Core Features:
 * 1. Rotating Minimap:
 *    - Player icon ALWAYS fixed at EXACT CENTER pointing UP.
 *    - Real-world 3D coordinates rotated by (playerYaw - PI).
 *    - Rotating North compass badge.
 *    - Upright Bengali text tags and circular clipping.
 * 2. Interactive Full Map:
 *    - Clickable/tappable location markers with real game-world data.
 *    - Clean Location Information Panel support.
 *    - Real-time player distance calculation.
 *    - Smooth zoom (+ / - / mousewheel / pinch) and pan controls.
 *    - Distinct category icons (🏠, 🍵, 🛒, 💊, 🏡, 🌳).
 */
export class MinimapRenderer {
  private readonly miniCanvas: HTMLCanvasElement;
  private readonly miniCtx: CanvasRenderingContext2D;
  private readonly fullCanvas: HTMLCanvasElement;
  private readonly fullCtx: CanvasRenderingContext2D;
  private readonly compassBadge: HTMLElement | null;

  private readonly bounds: WorldBounds;
  private readonly roads: RoadRect[];
  private readonly buildings: MapBuilding[];
  private readonly trees: MapTree[];

  // Smooth rotation state (shortest-arc interpolation)
  private smoothedYaw = Math.PI;
  private initializedYaw = false;

  // Full Map Interactive Navigation (Zoom & Pan)
  private fullMapZoom = 1.0;
  private fullMapPanX = 0;
  private fullMapPanY = 0;
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private lastTouchDist = 0;

  // Selected location state
  public selectedLocationId: string | null = null;
  private onLocationSelectCallback?: (detail: MapLocationDetail) => void;

  constructor(
    bounds: WorldBounds,
    roads: RoadRect[],
    buildings: MapBuilding[],
    trees: MapTree[],
    onLocationSelect?: (detail: MapLocationDetail) => void
  ) {
    this.miniCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.miniCtx = this.miniCanvas.getContext('2d')!;
    this.fullCanvas = document.getElementById('fullmap-canvas') as HTMLCanvasElement;
    this.fullCtx = this.fullCanvas.getContext('2d')!;
    this.compassBadge = document.querySelector('.minimap-compass');

    this.bounds = bounds;
    this.roads = roads;
    this.buildings = this.enrichBuildingMetadata(buildings);
    this.trees = trees;
    this.onLocationSelectCallback = onLocationSelect;

    this.bindFullMapInteractions();
  }

  public setLocationSelectCallback(cb: (detail: MapLocationDetail) => void): void {
    this.onLocationSelectCallback = cb;
  }

  /**
   * Enriches building objects with authentic Bangladeshi icons, categories, and descriptions.
   */
  private enrichBuildingMetadata(buildings: MapBuilding[]): MapBuilding[] {
    const metaMap: Record<
      string,
      { icon: string; catBn: string; catEn: string; descBn: string; accessible?: boolean }
    > = {
      mess: {
        icon: '🏠',
        catBn: 'মেস ভবন • আপনার রুম',
        catEn: 'Your Mess Room',
        descBn: 'আপনার থাকার মেস রুম। পড়ার টেবিল, বিছানা, সিলিং ফ্যান, মোমবাতি, চার্জার ফ্যান ও পাওয়ার ব্যাংক আছে।',
        accessible: true
      },
      tong_mama: {
        icon: '🍵',
        catBn: 'টং দোকান • মূল বাজার',
        catEn: 'Tea Stall',
        descBn: "রফিক মামার বিখ্যাত চায়ের টং। সকাল-সন্ধ্যা গরম কড়া দুধ চা (১০৳), লাল চা (৫৳) ও তাজা বিস্কুট পাওয়া যায়।",
        accessible: true
      },
      tong_haji: {
        icon: '🫖',
        catBn: 'টং দোকান • পূর্ব বাজার',
        catEn: 'Tea Stall',
        descBn: 'হাজী চাচার স্পেশাল আদা চা, মালাই চা ও টোস্ট বিস্কুটের জন্য পূর্ব বাজারে সুপরিচিত।',
        accessible: true
      },
      tong_bottola: {
        icon: '☕',
        catBn: 'টং দোকান • বটতলা চত্বর',
        catEn: 'Tea Stall',
        descBn: 'বটতলা চত্বরের ঠান্ডা বাতাসে বসে জসিম ভাইয়ের দুধ চা ও মিষ্টি পান খাওয়ার দারুণ আড্ডাখানা।',
        accessible: true
      },
      tong_kashem: {
        icon: '🍵',
        catBn: 'টং দোকান • পশ্চিম বিস্তার',
        catEn: 'Tea Stall',
        descBn: 'পশ্চিম পাড়ার নতুন কাঠের চায়ের টং। কাশেম ভাইয়ের লেবু চা, মাল্টা চা ও গরম শিঙাড়ার জন্য জনপ্রিয়।',
        accessible: true
      },
      shop_grocery: {
        icon: '🛒',
        catBn: 'মুদি দোকান • নিত্যপণ্য',
        catEn: 'Grocery Store',
        descBn: 'আল-আমিন স্টোর — চাল, ডাল, তেল, চিনি, ডিম, বিস্কুট ও মেসের যাবতীয় বাজার পাওয়া যায়।',
        accessible: true
      },
      shop_pharmacy: {
        icon: '💊',
        catBn: 'ফার্মেসি • জরুরী ঔষধ',
        catEn: 'Pharmacy',
        descBn: 'বিসমিল্লাহ ফার্মেসি — সকল প্রকার প্রয়োজনীয় ঔষধ ও ফার্স্ট এইডের জন্য পাড়ার নির্ভরযোগ্য দোকান।',
        accessible: true
      },
      shop_bkash: {
        icon: '📱',
        catBn: 'ভ্যারাইটিজ স্টোর • বিকাশ',
        catEn: 'Variety Store',
        descBn: 'জনতা ভ্যারাইটিজ স্টোর — বিকাশ, নগদ ক্যাশ-আউট, ফ্লেক্সিলোড ও নিত্যপ্রয়োজনীয় জিনিসপত্র।',
        accessible: true
      },
      shop_salon: {
        icon: '✂️',
        catBn: 'সেলুন ও লন্ড্রি • জেন্টস পার্লার',
        catEn: 'Salon & Laundry',
        descBn: 'ঢাকা সেলুন — চুল ও দাড়ি কাটা, ম্যাসাজ এবং জামাকাপড় ধোয়া ও আয়রনের সুব্যবস্থা।',
        accessible: true
      },
      shop_sweets: {
        icon: '🍯',
        catBn: 'মিষ্টান্ন ভাণ্ডার • ঐতিহ্যবাহী',
        catEn: 'Sweet Shop',
        descBn: 'মধুবন মিষ্টান্ন — গরম মচমচে জিলাপি, খাঁটি বগুড়ার দই, রসগোল্লা ও চমচম পাওয়া যায়।',
        accessible: true
      },
      shop_boighar: {
        icon: '📚',
        catBn: 'বই বিতান ও স্টেশনারি',
        catEn: 'Bookstore & Stationary',
        descBn: 'জ্ঞানালোক বইঘর — খাতা, কলম, মেসের পড়াশোনার গাইড বই, ফটোকপি ও প্রিন্টিং সেবা।',
        accessible: true
      },
      shop_tailor: {
        icon: '🧵',
        catBn: 'টেইলার্স অ্যান্ড ফেব্রিক্স',
        catEn: 'Tailor & Fabrics',
        descBn: 'জননী টেইলার্স — পাঞ্জাবি, শার্ট, প্যান্ট ও পায়জামা নিখুঁত মাপে সেলাই করা হয়।',
        accessible: true
      },
      shop_restaurant: {
        icon: '🍛',
        catBn: 'হোটেল ও রেস্তোরাঁ',
        catEn: 'Restaurant',
        descBn: 'আমানত হোটেল — সকালের গরম পরোটা-ভাজি, দুপুরের মাছ-ভাত এবং বিকেলের স্পেশাল বিরিয়ানি।',
        accessible: true
      },
      shop_diagnostic: {
        icon: '🏥',
        catBn: 'ডায়াগনস্টিক ও ক্লিনিক',
        catEn: 'Diagnostic Clinic',
        descBn: 'মাতৃছায়া চিকিৎসালয় — ২৪ ঘণ্টা জরুরি প্রাথমিক চিকিৎসা ও বিশেষজ্ঞ ডাক্তারের পরামর্শ।',
        accessible: true
      },
      club_library: {
        icon: '📖',
        catBn: 'পাঠাগার ও ক্লাব',
        catEn: 'Community Library',
        descBn: 'তরুণ সংঘ পাঠাগার — পাড়ার সাংস্কৃতিক কেন্দ্র, প্রতিদিনের জাতীয় পত্রিকা ও বই পড়ার উন্মুক্ত স্থান।',
        accessible: true
      },
      mess_annex: {
        icon: '🏢',
        catBn: 'মেস ভবন • ছাত্রাবাস',
        catEn: 'Student Mess',
        descBn: 'সবুজ ছাত্রাবাসের ২য় শাখা। শান্তিপূর্ণ পরিবেশে শিক্ষার্থীদের থাকার সুব্যবস্থা।',
        accessible: true
      },
      mess_probhati: {
        icon: '🏢',
        catBn: 'মেস ভবন • পশ্চিম পাড়া',
        catEn: 'Student Mess',
        descBn: 'প্রভাতী ছাত্রাবাস — খোলামেলা বারান্দা ও সুন্দর পরিবেশ বিশিষ্ট পুরোনো ছাত্র মেস।',
        accessible: true
      },
      mess_arunodoy: {
        icon: '🏢',
        catBn: 'মেস ভবন • উত্তর পাড়া',
        catEn: 'Student Mess',
        descBn: 'অরুণোদয় ছাত্রাবাস — তত্ত্বাবধায়ক রহিম চাচার পরিচালনায় সুশৃঙ্খল মেস ভবন।',
        accessible: true
      },
      mess_madhumati: {
        icon: '🏢',
        catBn: 'মেস ভবন • পশ্চিম বিস্তার',
        catEn: 'Student Mess',
        descBn: 'মধুমতী ছাত্রাবাস — পশ্চিম আবাসিক এলাকার আধুনিক ও নিরিবিলি ছাত্র মেস।',
        accessible: true
      },
      mess_padma_meghna: {
        icon: '🏢',
        catBn: 'মেস ভবন • পূর্ব পাড়া',
        catEn: 'Student Mess',
        descBn: 'পদ্মা-মেঘনা ছাত্রাবাস — অনার্স ও মাস্টার্সের ছাত্র ও চাকরিপ্রার্থীদের মেস ভবন।',
        accessible: true
      },
      tong_bareq: {
        icon: '🍵',
        catBn: 'টং দোকান • নদীর পাড়',
        catEn: 'Tea Stall',
        descBn: 'বারেক মামার নদী তীরের টং — নদীর স্নিগ্ধ বাতাস আর স্পেশাল কড়া মালাই চা ও বিস্কুট। মেসের আড্ডার প্রিয় স্থান।',
        accessible: true
      },
      mess_meghna: {
        icon: '🏢',
        catBn: 'মেস ভবন • মেঘনা ভিউ',
        catEn: 'Student Mess',
        descBn: 'মেঘনা ভিউ মেস ভবন — নদীমুখী মনোরম পরিবেশের শান্ত ও স্বাস্থ্যকর ছাত্রাবাস।',
        accessible: true
      },
      cricket_ground: {
        icon: '🏏',
        catBn: 'খেলার মাঠ ও ক্রিকেট পিচ',
        catEn: 'Cricket Ground',
        descBn: 'বটতলা সবুজ খেলার মাঠ ও ক্রিকেট পিচ — প্রতিদিন বিকেলে পাড়ার তরুণ ও ছাত্রদের প্রীতি ম্যাচ অনুষ্ঠিত হয়।',
        accessible: true
      },
      river_ghat: {
        icon: '⛵',
        catBn: 'নদী ঘাট ও নৌকা চত্বর',
        catEn: 'River Ghat',
        descBn: 'মেঘনা নদী ঘাট — বাঁধানো পাথরের ঘাট ও বাঁধা দেশি নৌকা। সকাল-সন্ধ্যায় নদীর বাতাস খাওয়ার মনোরম স্থান।',
        accessible: true
      },
      bridge_concrete: {
        icon: '🌉',
        catBn: 'পাক্কা কংক্রিট সেতু',
        catEn: 'Concrete Bridge',
        descBn: 'মেঘনা খালের ওপর পাকা আর্চ সেতু — পশ্চিম মূল বাজার ও পূর্ব নদী তীরবর্তী পাড়াকে যুক্ত করেছে।',
        accessible: true
      },
      bridge_bamboo: {
        icon: '🎋',
        catBn: 'বাঁশের সাঁকো ও কাঠের সেতু',
        catEn: 'Bamboo Footbridge',
        descBn: 'ঐতিহ্যবাহী গ্রামীণ বাঁশ ও কাঠের সাঁকো — পথচারীদের শান্ত মেঠোপথ দিয়ে খাল পারাপারের সুন্দর সাঁকো।',
        accessible: true
      },
      bridge_culvert: {
        icon: '🌉',
        catBn: 'দক্ষিণ কালভার্ট সেতু',
        catEn: 'Culvert Bridge',
        descBn: 'দক্ষিণ সংযোগ কালভার্ট ব্রিজ — গাড়ি, রিকশা ও পিকআপ চলাচলের টেকসই পাকা কালভার্ট সেতু।',
        accessible: true
      },
      house_padma: {
        icon: '🏡',
        catBn: 'আবাসিক বাড়ি • পদ্মা ভিলা',
        catEn: 'Padma Villa',
        descBn: 'নদীর তীরে অবস্থিত শান্ত দ্বিতল পারিবারিক বাড়ি।',
        accessible: false
      },
      house_surma: {
        icon: '🏡',
        catBn: 'আবাসিক বাড়ি • সুরমা কটেজ',
        catEn: 'Surma Cottage',
        descBn: 'সবুজ নারকেল বাগান ও আঙিনা ঘেরা পারিবারিক কটেজ।',
        accessible: false
      },
      bridge_steel_truss: {
        icon: '🌉',
        catBn: 'উত্তর স্টিল ট্রাস সেতু',
        catEn: 'North Steel Truss Bridge',
        descBn: 'মেঘনা খালের উত্তর প্রান্তে নির্মিত শক্তিশালী ব্লু স্টিল ট্রাস সেতু। ভারী যানবাহন ও কৃষিপণ্য পরিবহন সংযোগ।',
        accessible: true
      },
      shop_kitchen_market: {
        icon: '🥬',
        catBn: 'কাঁচাবাজার ও সবজি আড়ত',
        catEn: 'Kitchen & Veggie Market',
        descBn: 'কাঁচাবাজার — দেশি গোল আলু, কচি লাউ, পাকা লাল টমেটো, কাঁচামরিচ ও তরতাজা মেসের বাজার।',
        accessible: true
      },
      shop_fruit_stall: {
        icon: '🥭',
        catBn: 'সততা ফল ভাণ্ডার',
        catEn: 'Fresh Fruit Stall',
        descBn: 'সততা ফল ভাণ্ডার — মিষ্টি পাকা আম, ঠান্ডা ডাবের পানি, সবরি কলা ও সুস্বাদু তাজা ফলমূল।',
        accessible: true
      },
      shop_fish_market: {
        icon: '🐟',
        catBn: 'মেঘনা তাজা মাছের আড়ত',
        catEn: 'Fresh Fish Market',
        descBn: 'মেঘনা মাছের আড়ত — সকালের ট্রলারে আসা রূপালী তাজা ইলিশ, বড় রুই ও নদীর মাছ।',
        accessible: true
      },
      shop_fuchka: {
        icon: '🍲',
        catBn: 'বিসমিল্লাহ ফুচকা ও চটপটি',
        catEn: 'Fuchka & Chotpoti Stall',
        descBn: 'বিসমিল্লাহ ফুচকা চত্বর — মচমচে টক-ঝাল স্পেশাল ফুচকা ও সেদ্ধ ডিম চটপটি।',
        accessible: true
      },
      shop_hardware: {
        icon: '🔧',
        catBn: 'ভাই ভাই হার্ডওয়্যার',
        catEn: 'Hardware & Tools',
        descBn: 'ভাই ভাই হার্ডওয়্যার — এলইডি বাল্ব, সুইচ, সকেট, ব্যাটারি ও ইলেকট্রিক সামগ্রী।',
        accessible: true
      },
      shop_telecom: {
        icon: '💳',
        catBn: 'ডিজিটাল বিকাশ-নগদ সেবা',
        catEn: 'Digital Telecom & Banking',
        descBn: 'ডিজিটাল পয়েন্ট — মোবাইল ব্যালেন্স রিচার্জ, বিকাশ-নগদ ক্যাশ আউট ও মোবাইল এক্সেসরিজ।',
        accessible: true
      },
      mess_dhanmondi: {
        icon: '🏢',
        catBn: 'মেস ভবন • ধানমন্ডি মেস',
        catEn: 'Student Mess',
        descBn: 'ধানমন্ডি ছাত্রাবাস — পশ্চিম আবাসিক পাড়ার নিরিবিলি ছাত্র মেস ভবন।',
        accessible: true
      },
      mess_jamuna: {
        icon: '🏢',
        catBn: 'মেস ভবন • যমুনা ছাত্রাবাস',
        catEn: 'Student Mess',
        descBn: 'যমুনা ছাত্রাবাস — পূর্ব কৃষি পল্লী সংলগ্ন খোলামেলা ছাত্রাবাস।',
        accessible: true
      },
      mess_shapla: {
        icon: '🏢',
        catBn: 'মেস ভবন • শাপলা মেস',
        catEn: 'Student Mess',
        descBn: 'শাপলা ছাত্রাবাস — দক্ষিণ-পশ্চিম কলোনির শান্ত মেস ভবন।',
        accessible: true
      },
      house_rupnagar: {
        icon: '🏡',
        catBn: 'রূপনগর ভিলা',
        catEn: 'Rupnagar Villa',
        descBn: 'পশ্চিম পাড়ার সুদৃশ্য পারিবারিক পাকা বাড়ি।',
        accessible: false
      },
      house_greenview: {
        icon: '🏡',
        catBn: 'গ্রিন ভিউ ভিলা',
        catEn: 'Green View Villa',
        descBn: 'সবুজ বাগান ও আঙিনায় ঘেরা সুন্দর পারিবারিক বাড়ি।',
        accessible: false
      },
      house_agrohamlet: {
        icon: '🏡',
        catBn: 'এগ্রো পল্লী খামার বাড়ি',
        catEn: 'Agro Hamlet Homestead',
        descBn: 'নদী ওপাড়ের সবুজ কৃষি খামার ও গ্রাম্য বসতভিটা।',
        accessible: false
      },
      house_sonargaon: {
        icon: '🏡',
        catBn: 'সোনারগাঁও ভিলা',
        catEn: 'Sonargaon Villa',
        descBn: 'পূর্ব আবাসিক পাড়ার ঐতিহ্যবাহী দ্বিতল বাড়ি।',
        accessible: false
      }
    };

    return buildings.map((b) => {
      const meta = metaMap[b.id] || {
        icon: b.kind === 'house' ? '🏡' : '🏢',
        catBn: b.kind === 'house' ? 'আবাসিক বাড়ি • বসতভিটা' : 'ভবন',
        catEn: b.kind === 'house' ? 'Residential House' : 'Building',
        descBn: `${b.nameBn} — পাড়ার শান্ত আবাসিক পরিবারিক বাড়ি। চারপাশে সবুজ গাছপালা ও পরিচ্ছন্ন পরিবেশ।`,
        accessible: false
      };
      return {
        ...b,
        icon: meta.icon,
        categoryBn: meta.catBn,
        categoryEn: meta.catEn,
        descriptionBn: meta.descBn,
        accessible: meta.accessible ?? true
      };
    });
  }

  public render(params: {
    playerX: number;
    playerZ: number;
    playerYaw: number;
    npcs: NPCEntity[];
    vehicles?: VehicleEntity[];
    powerOn: boolean;
    isNight: boolean;
    fullMapOpen: boolean;
  }): void {
    // Smoothly interpolate yaw across shortest arc to prevent wrapping pops
    if (!this.initializedYaw) {
      this.smoothedYaw = params.playerYaw;
      this.initializedYaw = true;
    } else {
      let diff = params.playerYaw - this.smoothedYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.smoothedYaw += diff * 0.35;
      while (this.smoothedYaw > Math.PI) this.smoothedYaw -= Math.PI * 2;
      while (this.smoothedYaw < -Math.PI) this.smoothedYaw += Math.PI * 2;
    }

    this.renderRotatingMinimap(params);
    if (params.fullMapOpen) {
      this.renderFullMap(params);
    }
  }

  private buildingColors(kind: MapBuilding['kind']): { fill: string; stroke: string } {
    switch (kind) {
      case 'mess':
        return { fill: '#059669', stroke: '#6ee7b7' };
      case 'tong':
        return { fill: '#d97706', stroke: '#fde68a' };
      case 'shop':
        return { fill: '#be185d', stroke: '#fbcfe8' };
      case 'bridge':
        return { fill: '#475569', stroke: '#94a3b8' };
      case 'river':
        return { fill: '#0284c7', stroke: '#38bdf8' };
      case 'park':
        return { fill: '#15803d', stroke: '#86efac' };
      default:
        return { fill: '#334155', stroke: 'rgba(255,255,255,0.28)' };
    }
  }

  /**
   * Proper 3D Rotating Minimap
   * The camera is locked to the player's position and orientation:
   * Player is ALWAYS at (cx, cy) pointing UP.
   * World rotates by (playerYaw - Math.PI) around (cx, cy).
   */
  private renderRotatingMinimap(params: {
    playerX: number;
    playerZ: number;
    npcs: NPCEntity[];
    vehicles?: VehicleEntity[];
    powerOn: boolean;
    isNight: boolean;
  }): void {
    const ctx = this.miniCtx;
    const w = this.miniCanvas.width;
    const h = this.miniCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2;
    const scale = 3.6; // pixels per world meter (~33m radius field of view)

    const rotAngle = this.smoothedYaw - Math.PI;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // 1. Circular boundary clip
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    // 2. Base ground background
    ctx.fillStyle = params.isNight
      ? params.powerOn
        ? '#10241c'
        : '#08120e'
      : '#1a3727';
    ctx.fillRect(0, 0, w, h);

    // 3. Distance radar rings (fixed relative to HUD circle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    for (const r of [radius * 0.35, radius * 0.7]) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 4. TRANSFORM CONTEXT FOR ROTATING WORLD
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotAngle);
    ctx.scale(scale, scale);
    ctx.translate(-params.playerX, -params.playerZ);

    // 4A. Meghna Canal River & Embankment
    ctx.fillStyle = params.isNight ? '#0369a1' : '#0284c7';
    ctx.fillRect(58, -130, 16, 260);
    ctx.fillStyle = '#475569';
    ctx.fillRect(57.4, -130, 0.7, 260);
    ctx.fillRect(73.9, -130, 0.7, 260);

    // 4B. Roads, Lanes & Plazas
    for (const road of this.roads) {
      const distSq = (road.x - params.playerX) ** 2 + (road.z - params.playerZ) ** 2;
      const maxDim = Math.max(road.width, road.depth);
      if (distSq > ((radius / scale + maxDim) ** 2)) continue;

      ctx.fillStyle =
        road.kind === 'asphalt'
          ? '#3b424c'
          : road.kind === 'lane'
            ? '#7c4f3d'
            : '#64748b';
      ctx.fillRect(
        road.x - road.width / 2,
        road.z - road.depth / 2,
        road.width,
        road.depth
      );
    }

    // 4C. Trees
    ctx.fillStyle = 'rgba(34, 197, 94, 0.42)';
    for (const tree of this.trees) {
      const distSq = (tree.x - params.playerX) ** 2 + (tree.z - params.playerZ) ** 2;
      if (distSq > ((radius / scale + 5) ** 2)) continue;

      ctx.beginPath();
      ctx.arc(tree.x, tree.z, tree.radius * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4D. Buildings & Structures
    for (const b of this.buildings) {
      const distSq = (b.x - params.playerX) ** 2 + (b.z - params.playerZ) ** 2;
      const maxDim = Math.max(b.width, b.depth);
      if (distSq > ((radius / scale + maxDim) ** 2)) continue;

      const { fill, stroke } = this.buildingColors(b.kind);
      ctx.fillStyle = fill;
      ctx.fillRect(b.x - b.width / 2, b.z - b.depth / 2, b.width, b.depth);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = b.kind === 'house' ? 0.35 : 0.6;
      ctx.strokeRect(b.x - b.width / 2, b.z - b.depth / 2, b.width, b.depth);
    }

    // 4E. Live NPCs
    for (const npc of params.npcs) {
      const distSq = (npc.position.x - params.playerX) ** 2 + (npc.position.z - params.playerZ) ** 2;
      if (distSq > ((radius / scale + 2) ** 2)) continue;

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(npc.position.x, npc.position.z, 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.25;
      ctx.stroke();
    }

    // 4F. Live Moving Vehicles (Rickshaws, CNGs, Cars, Pickups, Bikes)
    if (params.vehicles) {
      for (const v of params.vehicles) {
        const distSq = (v.position.x - params.playerX) ** 2 + (v.position.z - params.playerZ) ** 2;
        if (distSq > ((radius / scale + 5) ** 2)) continue;

        ctx.save();
        ctx.translate(v.position.x, v.position.z);
        ctx.rotate(v.yaw);

        const vColor =
          v.type === 'cng'
            ? '#22c55e'
            : v.type === 'truck'
              ? '#f97316'
              : v.type === 'car'
                ? '#38bdf8'
                : v.type === 'rickshaw'
                  ? '#eab308'
                  : '#a855f7';

        ctx.fillStyle = vColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.25;

        const halfW = (v.width || 1.6) * 0.45;
        const halfL = (v.length || 3.0) * 0.45;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-halfW, -halfL, halfW * 2, halfL * 2, 0.3);
        } else {
          ctx.rect(-halfW, -halfL, halfW * 2, halfL * 2);
        }
        ctx.fill();
        ctx.stroke();

        // Forward indicator
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(0, halfL + 0.6);
        ctx.lineTo(-halfW * 0.5, halfL);
        ctx.lineTo(halfW * 0.5, halfL);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    // Restore from rotating world transform
    ctx.restore();

    // 5. UPRIGHT BENGALI LABELS
    const cosA = Math.cos(rotAngle);
    const sinA = Math.sin(rotAngle);

    for (const b of this.buildings) {
      const dx = b.x - params.playerX;
      const dz = b.z - params.playerZ;
      const sx = cx + (dx * cosA - dz * sinA) * scale;
      const sy = cy + (dx * sinA + dz * cosA) * scale;
      const dist = Math.hypot(sx - cx, sy - cy);
      if (dist < radius - 16) {
        if (
          b.kind === 'mess' ||
          b.kind === 'tong' ||
          b.kind === 'shop' ||
          b.kind === 'bridge' ||
          b.kind === 'park' ||
          b.kind === 'river'
        ) {
          const tag =
            b.id === 'mess' || b.id === 'mess_meghna'
              ? 'মেস'
              : b.kind === 'tong'
                ? 'টং'
                : b.id === 'cricket_ground'
                  ? 'মাঠ'
                  : b.id === 'river_ghat'
                    ? 'ঘাট'
                    : b.id === 'bridge_concrete'
                      ? 'সেতু'
                      : b.id === 'bridge_bamboo'
                        ? 'সাঁকো'
                        : b.id === 'bridge_culvert'
                          ? 'কালভার্ট'
                          : b.id.includes('pharmacy')
                            ? 'ঔষধ'
                            : b.id.includes('bkash')
                              ? 'বিকাশ'
                              : b.id.includes('boighar')
                                ? 'বই'
                                : b.id.includes('restaurant')
                                  ? 'খাবার'
                                  : 'দোকান';

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px "Hind Siliguri", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(tag, sx, sy);
        }
      }
    }

    // 6. PLAYER ICON AT EXACT CENTER POINTING STRAIGHT UP
    const coneGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 38);
    coneGrad.addColorStop(0, 'rgba(56, 189, 248, 0.48)');
    coneGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 38, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 11);
    ctx.lineTo(cx - 7, cy + 7);
    ctx.lineTo(cx, cy + 3.5);
    ctx.lineTo(cx + 7, cy + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy + 0.5, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 7. ROTATING CARDINAL COMPASS INDICATOR
    const compassR = radius - 11;
    const nx = cx - compassR * Math.sin(this.smoothedYaw);
    const ny = cy + compassR * Math.cos(this.smoothedYaw);

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(nx, ny, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9.5px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', nx, ny);

    if (this.compassBadge) {
      const ringRadius = 68;
      const badgeX = ringRadius - ringRadius * Math.sin(this.smoothedYaw);
      const badgeY = ringRadius + ringRadius * Math.cos(this.smoothedYaw);
      this.compassBadge.style.left = `${badgeX}px`;
      this.compassBadge.style.top = `${badgeY}px`;
      this.compassBadge.style.transform = 'translate(-50%, -50%)';
    }

    ctx.restore();
  }

  /**
   * Set up mouse and touch zoom/pan and location click handlers for Full Map.
   */
  private bindFullMapInteractions(): void {
    if (!this.fullCanvas) return;

    // Mouse drag to pan
    this.fullCanvas.addEventListener('mousedown', (e) => {
      this.isPanning = true;
      this.panStartX = e.clientX - this.fullMapPanX;
      this.panStartY = e.clientY - this.fullMapPanY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      this.fullMapPanX = e.clientX - this.panStartX;
      this.fullMapPanY = e.clientY - this.panStartY;
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
    });

    // Mouse wheel to zoom centered on cursor
    this.fullCanvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 1.15 : 0.87;
        const newZoom = Math.min(3.5, Math.max(0.75, this.fullMapZoom * zoomDelta));

        const rect = this.fullCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        this.fullMapPanX = mouseX - (mouseX - this.fullMapPanX) * (newZoom / this.fullMapZoom);
        this.fullMapPanY = mouseY - (mouseY - this.fullMapPanY) * (newZoom / this.fullMapZoom);
        this.fullMapZoom = newZoom;
      },
      { passive: false }
    );

    // Click on canvas to select location
    this.fullCanvas.addEventListener('click', (e) => {
      const rect = this.fullCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      this.handleLocationClick(clickX, clickY);
    });

    // Mobile touch pan & pinch to zoom
    this.fullCanvas.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length === 1) {
          const t = e.touches[0];
          this.isPanning = true;
          this.panStartX = t.clientX - this.fullMapPanX;
          this.panStartY = t.clientY - this.fullMapPanY;
        } else if (e.touches.length === 2) {
          this.isPanning = false;
          this.lastTouchDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      },
      { passive: true }
    );

    this.fullCanvas.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 1 && this.isPanning) {
          const t = e.touches[0];
          this.fullMapPanX = t.clientX - this.panStartX;
          this.fullMapPanY = t.clientY - this.panStartY;
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (this.lastTouchDist > 0) {
            const factor = dist / this.lastTouchDist;
            this.fullMapZoom = Math.min(3.5, Math.max(0.75, this.fullMapZoom * factor));
          }
          this.lastTouchDist = dist;
        }
      },
      { passive: true }
    );

    this.fullCanvas.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        this.isPanning = false;
        this.lastTouchDist = 0;
      }
    });
  }

  public zoomIn(): void {
    this.fullMapZoom = Math.min(3.5, this.fullMapZoom * 1.25);
  }

  public zoomOut(): void {
    this.fullMapZoom = Math.max(0.75, this.fullMapZoom / 1.25);
  }

  public resetFullMapView(): void {
    this.fullMapZoom = 1.0;
    this.fullMapPanX = 0;
    this.fullMapPanY = 0;
  }

  public centerOnLocation(id: string): void {
    const loc = this.buildings.find((b) => b.id === id);
    if (!loc) return;
    this.selectedLocationId = id;
    this.fullMapZoom = 1.6;
    const w = this.fullCanvas.width;
    const h = this.fullCanvas.height;
    const worldW = this.bounds.maxX - this.bounds.minX;
    const worldD = this.bounds.maxZ - this.bounds.minZ;
    const baseScale = Math.min((w - 48) / worldW, (h - 48) / worldD);

    const targetX = ((loc.x - this.bounds.minX) / worldW) * w;
    const targetY = ((loc.z - this.bounds.minZ) / worldD) * h;
    this.fullMapPanX = w / 2 - targetX * this.fullMapZoom;
    this.fullMapPanY = h / 2 - targetY * this.fullMapZoom;
  }

  private handleLocationClick(screenX: number, screenY: number): void {
    const w = this.fullCanvas.width;
    const h = this.fullCanvas.height;

    const pad = 24;
    const worldW = this.bounds.maxX - this.bounds.minX;
    const worldD = this.bounds.maxZ - this.bounds.minZ;
    const baseScale = Math.min((w - pad * 2) / worldW, (h - pad * 2) / worldD);
    const scale = baseScale * this.fullMapZoom;

    const offsetX = (w - worldW * scale) / 2 + this.fullMapPanX;
    const offsetY = (h - worldD * scale) / 2 + this.fullMapPanY;

    // Convert screenX, screenY back to World coordinates
    const worldX = (screenX - offsetX) / scale + this.bounds.minX;
    const worldZ = (screenY - offsetY) / scale + this.bounds.minZ;

    // Find nearest building/poi within click threshold
    let nearest: MapBuilding | null = null;
    let minDist = 7.5; // hit radius in meters

    for (const b of this.buildings) {
      const d = Math.hypot(b.x - worldX, b.z - worldZ);
      if (d < minDist) {
        minDist = d;
        nearest = b;
      }
    }

    if (nearest) {
      this.selectedLocationId = nearest.id;
      if (this.onLocationSelectCallback) {
        this.onLocationSelectCallback({
          id: nearest.id,
          nameBn: nearest.nameBn,
          nameEn: nearest.nameEn,
          categoryBn: nearest.categoryBn || 'ভবন',
          categoryEn: nearest.categoryEn || 'Building',
          icon: nearest.icon || '🏠',
          descriptionBn: nearest.descriptionBn || 'বাস্তবসম্মত বাংলাদেশি স্থাপনা।',
          worldX: Number(nearest.x.toFixed(1)),
          worldZ: Number(nearest.z.toFixed(1)),
          distance: 0, // updated dynamically in caller
          accessible: nearest.accessible ?? true
        });
      }
    }
  }

  /**
   * Interactive Full Map View
   */
  private renderFullMap(params: {
    playerX: number;
    playerZ: number;
    playerYaw: number;
    npcs: NPCEntity[];
    vehicles?: VehicleEntity[];
    powerOn: boolean;
    isNight: boolean;
  }): void {
    const ctx = this.fullCtx;
    const w = this.fullCanvas.width;
    const h = this.fullCanvas.height;

    const pad = 24;
    const worldW = this.bounds.maxX - this.bounds.minX;
    const worldD = this.bounds.maxZ - this.bounds.minZ;
    const baseScale = Math.min((w - pad * 2) / worldW, (h - pad * 2) / worldD);
    const scale = baseScale * this.fullMapZoom;

    const offsetX = (w - worldW * scale) / 2 + this.fullMapPanX;
    const offsetY = (h - worldD * scale) / 2 + this.fullMapPanY;

    const toX = (wx: number) => offsetX + (wx - this.bounds.minX) * scale;
    const toY = (wz: number) => offsetY + (wz - this.bounds.minZ) * scale;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Map background
    ctx.fillStyle = params.isNight ? '#0a1713' : '#142c1f';
    ctx.fillRect(0, 0, w, h);

    // Coordinate grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const startX = Math.ceil(this.bounds.minX / 10) * 10;
    for (let x = startX; x <= this.bounds.maxX; x += 10) {
      ctx.beginPath();
      ctx.moveTo(toX(x), 0);
      ctx.lineTo(toX(x), h);
      ctx.stroke();
    }
    const startZ = Math.ceil(this.bounds.minZ / 10) * 10;
    for (let z = startZ; z <= this.bounds.maxZ; z += 10) {
      ctx.beginPath();
      ctx.moveTo(0, toY(z));
      ctx.lineTo(w, toY(z));
      ctx.stroke();
    }

    // Meghna River Canal
    ctx.fillStyle = params.isNight ? '#0369a1' : '#0284c7';
    ctx.fillRect(
      toX(58),
      toY(this.bounds.minZ),
      (74 - 58) * scale,
      (this.bounds.maxZ - this.bounds.minZ) * scale
    );
    // Stone embankments
    ctx.fillStyle = '#475569';
    ctx.fillRect(toX(57.4), toY(this.bounds.minZ), 0.7 * scale, (this.bounds.maxZ - this.bounds.minZ) * scale);
    ctx.fillRect(toX(73.9), toY(this.bounds.minZ), 0.7 * scale, (this.bounds.maxZ - this.bounds.minZ) * scale);

    // Roads & Courtyards
    for (const road of this.roads) {
      ctx.fillStyle =
        road.kind === 'asphalt'
          ? '#3b424c'
          : road.kind === 'lane'
            ? '#845542'
            : '#64748b';
      ctx.fillRect(
        toX(road.x - road.width / 2),
        toY(road.z - road.depth / 2),
        road.width * scale,
        road.depth * scale
      );
    }

    // Street Names & Landmarks
    ctx.fillStyle = 'rgba(226, 232, 240, 0.76)';
    ctx.font = `600 ${Math.max(10, 11 * this.fullMapZoom)}px "Hind Siliguri", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('মূল বাজার সড়ক (Main Bazar Road)', toX(0), toY(2.0) + 4);
    ctx.fillText('বটতলা চত্বর', toX(-8.2), toY(13.8));
    ctx.fillText('কাশেমের টং চত্বর', toX(-42.0), toY(-2.2) - 4);
    ctx.fillText('পূর্ব বাজার মোড়', toX(42.0), toY(-2.2) - 4);
    ctx.fillText('মেঘনা খাল ও নদী (Meghna Canal)', toX(66), toY(-20));
    ctx.fillText('উত্তর স্টিল ট্রাস সেতু', toX(63), toY(-68.0) - 7);
    ctx.fillText('বাঁশের সাঁকো', toX(63), toY(-36.0) - 6);
    ctx.fillText('পাক্কা কংক্রিট সেতু', toX(63), toY(2.0) - 7);
    ctx.fillText('দক্ষিণ কালভার্ট সেতু', toX(63), toY(39.2) - 6);
    ctx.fillText('উত্তর হাইওয়ে (North Highway)', toX(0), toY(-68.0) + 4);
    ctx.fillText('দক্ষিণ কলোনি সড়ক', toX(0), toY(39.2) + 4);
    ctx.fillText('নদী তীরবর্তী সড়ক (Promenade)', toX(81.5), toY(-24));
    ctx.fillText('পূর্ব নদী তীরবর্তী পাড়া (East District)', toX(95), toY(-2));

    // Trees
    ctx.fillStyle = 'rgba(34, 197, 94, 0.36)';
    for (const tree of this.trees) {
      ctx.beginPath();
      ctx.arc(toX(tree.x), toY(tree.z), tree.radius * scale * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }

    // Buildings with interactive pins & selection highlights
    for (const b of this.buildings) {
      const bx = toX(b.x - b.width / 2);
      const by = toY(b.z - b.depth / 2);
      const bw = b.width * scale;
      const bh = b.depth * scale;

      const isSelected = this.selectedLocationId === b.id;
      const { fill, stroke } = this.buildingColors(b.kind);

      ctx.fillStyle = fill;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeStyle = isSelected ? '#38bdf8' : stroke;
      ctx.lineWidth = isSelected ? 3 : b.kind === 'house' ? 1 : 2;
      ctx.strokeRect(bx, by, bw, bh);

      // Selected Location Glowing Pulse Ring
      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const pulse = 4 + Math.sin(Date.now() * 0.006) * 3;
        ctx.arc(toX(b.x), toY(b.z), Math.max(bw, bh) * 0.65 + pulse, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Location Icon Badge
      if (b.icon && scale > 1.8) {
        ctx.font = `${Math.max(11, 13 * this.fullMapZoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.icon, toX(b.x), toY(b.z) - 6);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font =
        b.kind === 'mess' || b.kind === 'tong' || isSelected
          ? `700 ${Math.max(9.5, 10.5 * this.fullMapZoom)}px "Hind Siliguri", sans-serif`
          : `500 ${Math.max(8, 9 * this.fullMapZoom)}px "Hind Siliguri", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.nameBn, toX(b.x), toY(b.z) + (b.icon && scale > 1.8 ? 6 : 0));
    }

    // Live NPCs
    for (const npc of params.npcs) {
      const nx = toX(npc.position.x);
      const ny = toY(npc.position.z);
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(nx, ny, 3.5 * this.fullMapZoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // Live Moving Vehicles
    if (params.vehicles) {
      for (const v of params.vehicles) {
        const vx = toX(v.position.x);
        const vy = toY(v.position.z);
        const vYaw = Math.atan2(Math.cos(v.yaw), Math.sin(v.yaw));

        ctx.save();
        ctx.translate(vx, vy);
        ctx.rotate(vYaw);

        const vColor =
          v.type === 'cng'
            ? '#22c55e'
            : v.type === 'truck'
              ? '#f97316'
              : v.type === 'car'
                ? '#38bdf8'
                : v.type === 'rickshaw'
                  ? '#eab308'
                  : '#a855f7';

        ctx.fillStyle = vColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.0;

        const vW = Math.max(3.5, (v.width || 1.6) * scale * 0.7);
        const vL = Math.max(6.0, (v.length || 3.0) * scale * 0.7);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-vW / 2, -vL / 2, vW, vL, 2);
        } else {
          ctx.rect(-vW / 2, -vL / 2, vW, vL);
        }
        ctx.fill();
        ctx.stroke();

        // Front direction tick
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(0, vL / 2 + 2.8);
        ctx.lineTo(-vW * 0.4, vL / 2);
        ctx.lineTo(vW * 0.4, vL / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }

    // Live Player Marker with actual facingYaw rotation
    const px = toX(params.playerX);
    const py = toY(params.playerZ);
    const angle = Math.atan2(Math.cos(params.playerYaw), Math.sin(params.playerYaw));

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle);
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(12.5, 0);
    ctx.lineTo(-7.5, -7.5);
    ctx.lineTo(-4.5, 0);
    ctx.lineTo(-7.5, 7.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Player pulse wave on map
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 12 + (Date.now() % 1200) * 0.012, 0, Math.PI * 2);
    ctx.stroke();

    // Map Legend & Cardinal North indicator
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('N ↑', w - 18, 24);

    ctx.restore();
  }
}
