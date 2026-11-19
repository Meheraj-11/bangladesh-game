import * as THREE from 'three';

export type WeatherType = 'clear' | 'cloudy' | 'light_rain' | 'heavy_rain' | 'thunderstorm';

export type TimePhase = 'dawn' | 'morning' | 'day' | 'afternoon' | 'evening' | 'night';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  label?: string;
}

export interface RoadRect {
  x: number;
  z: number;
  width: number;
  depth: number;
  kind: 'asphalt' | 'lane' | 'plaza';
}

export type SpeedMode = 'walk' | 'fast' | 'sprint';

export interface MapBuilding {
  id: string;
  nameBn: string;
  nameEn: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  color: string;
  kind: 'mess' | 'tong' | 'shop' | 'house' | 'courtyard' | 'bridge' | 'river' | 'park';
  categoryBn?: string;
  categoryEn?: string;
  icon?: string;
  descriptionBn?: string;
  accessible?: boolean;
}

export interface BridgeData {
  id: string;
  nameBn: string;
  nameEn: string;
  kind: 'concrete' | 'footbridge' | 'culvert';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  deckY: number;
  hasVehicles: boolean;
}

export type VehicleType = 'rickshaw' | 'cng' | 'car' | 'truck' | 'motorcycle';

export interface VehicleEntity {
  id: string;
  type: VehicleType;
  mesh: THREE.Group;
  position: THREE.Vector3;
  yaw: number;
  speed: number;
  targetSpeed: number;
  length: number;
  width: number;
  wheels: THREE.Mesh[];
  headlights: THREE.Light[];
  headlightMats: THREE.MeshStandardMaterial[];
  currentWaypoint: number;
  honkCooldown: number;
  pedalCrank?: THREE.Group;
  pullerLeftLeg?: THREE.Group;
  pullerRightLeg?: THREE.Group;
  pedalAngle?: number;
  steeringFork?: THREE.Group;
}

export type DialogueTopicCategory =
  | 'daily_life'
  | 'education'
  | 'bangladesh_life'
  | 'entertainment'
  | 'food_lifestyle'
  | 'friends_social'
  | 'casual_funny';

export interface DialogueTopic {
  id: string;
  category: DialogueTopicCategory;
  labelBn: string;
  icon: string;
  comfortReward: number;
  energyReward: number;
}

export interface MapLocationDetail {
  id: string;
  nameBn: string;
  nameEn: string;
  categoryBn: string;
  categoryEn: string;
  icon: string;
  descriptionBn: string;
  worldX: number;
  worldZ: number;
  distance: number;
  accessible: boolean;
}

export interface MapTree {
  x: number;
  z: number;
  radius: number;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface NamedZone {
  id: string;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  isTong?: boolean;
  isMess?: boolean;
  tongOwnerId?: string;
}

export type InteractableType =
  | 'bed'
  | 'mess_chair'
  | 'candle'
  | 'emergency_fan'
  | 'mosquito_coil'
  | 'power_bank'
  | 'wall_switch'
  | 'tong_chair'
  | 'tong_counter'
  | 'outdoor_bench'
  | 'tubewell'
  | 'notice_board'
  | 'rickshaw_bell'
  | 'shop_counter'
  | 'npc';

export interface Interactable {
  id: string;
  type: InteractableType;
  labelBn: string;
  labelEn: string;
  icon: string;
  position: THREE.Vector3;
  radius: number;
  sitPosition?: THREE.Vector3;
  sitFacing?: number;
  npcId?: string;
  shopId?: string;
  insideMess?: boolean;
}

export interface SaveData {
  playerX: number;
  playerZ: number;
  playerYaw: number;
  timeOfDay: number; // 0..24 hours (fully automatic)
  weather: WeatherType; // fully automatic
  powerOn: boolean; // fully automatic
  roomLightSwitchOn: boolean;
  ceilingFanSwitchOn: boolean;
  candleLit: boolean;
  emergencyFanOn: boolean;
  emergencyFanBattery: number;
  mosquitoCoilLit: boolean;
  mosquitoCoilTimer: number;
  phoneCharging: boolean;
  phoneBattery: number;
  powerBankBattery: number;
  temperature: number;
  energy: number;
  comfort: number;
  money: number;
  biscuits: number;
  hasTeaCup: boolean;
  teaSipsLeft: number;
  teaCupsDrunk: number;
  loadSheddingSurvived: number;
}

export interface ActionButtonSpec {
  id: string;
  label: string;
  icon: string;
  active?: boolean;
  primary?: boolean;
  onClick: () => void;
}
