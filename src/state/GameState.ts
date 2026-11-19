import { SaveData, TimePhase, WeatherType } from '../types';

const STORAGE_KEY = 'amar_bangladesh_3d_save_v2';
const LEGACY_KEY = 'amar_bangladesh_3d_save_v1';

const VALID_WEATHERS: WeatherType[] = [
  'clear',
  'cloudy',
  'light_rain',
  'heavy_rain',
  'thunderstorm'
];

export function createDefaultState(): SaveData {
  return {
    playerX: -10.0,
    playerZ: -2.4,
    playerYaw: Math.PI, // Facing North directly toward the Mess Room doorway
    timeOfDay: 16.5, // Warm late afternoon -> naturally flows into dusk, night, dawn, morning
    weather: 'clear',
    powerOn: true,
    roomLightSwitchOn: true,
    ceilingFanSwitchOn: true,
    candleLit: false,
    emergencyFanOn: false,
    emergencyFanBattery: 100,
    mosquitoCoilLit: false,
    mosquitoCoilTimer: 0,
    phoneCharging: false,
    phoneBattery: 68,
    powerBankBattery: 100,
    temperature: 29.0,
    energy: 88,
    comfort: 84,
    money: 160,
    biscuits: 1,
    hasTeaCup: false,
    teaSipsLeft: 0,
    teaCupsDrunk: 0,
    loadSheddingSurvived: 0
  };
}

export class GameStateManager {
  public data: SaveData;

  constructor() {
    this.data = createDefaultState();
  }

  public hasSavedGame(): boolean {
    try {
      return (
        localStorage.getItem(STORAGE_KEY) !== null ||
        localStorage.getItem(LEGACY_KEY) !== null
      );
    } catch {
      return false;
    }
  }

  public load(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as Partial<SaveData> & { isRaining?: boolean };
      const defaults = createDefaultState();
      const merged: SaveData = { ...defaults, ...parsed };

      // Migrate legacy v1 boolean rain state cleanly
      if (!VALID_WEATHERS.includes(merged.weather)) {
        merged.weather = parsed.isRaining ? 'light_rain' : 'clear';
      }

      // Guard numeric fields against NaN/corruption
      if (!Number.isFinite(merged.playerX)) merged.playerX = defaults.playerX;
      if (!Number.isFinite(merged.playerZ)) merged.playerZ = defaults.playerZ;
      if (!Number.isFinite(merged.playerYaw)) merged.playerYaw = defaults.playerYaw;
      if (!Number.isFinite(merged.timeOfDay)) merged.timeOfDay = defaults.timeOfDay;
      merged.timeOfDay = ((merged.timeOfDay % 24) + 24) % 24;
      merged.energy = Math.max(5, Math.min(100, Number(merged.energy) || defaults.energy));
      merged.comfort = Math.max(5, Math.min(100, Number(merged.comfort) || defaults.comfort));
      merged.phoneBattery = Math.max(5, Math.min(100, Number(merged.phoneBattery) || defaults.phoneBattery));
      merged.money = Math.max(0, Number.isFinite(merged.money) ? merged.money : defaults.money);

      this.data = merged;
      return true;
    } catch {
      this.data = createDefaultState();
      return false;
    }
  }

  public save(): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      return true;
    } catch {
      return false;
    }
  }

  public reset(): void {
    this.data = createDefaultState();
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      // ignore storage errors
    }
  }

  public getTimePhase(): TimePhase {
    const t = this.data.timeOfDay;
    if (t >= 5.2 && t < 6.8) return 'dawn';
    if (t >= 6.8 && t < 11.2) return 'morning';
    if (t >= 11.2 && t < 15.5) return 'day';
    if (t >= 15.5 && t < 17.5) return 'afternoon';
    if (t >= 17.5 && t < 19.0) return 'evening';
    return 'night';
  }

  public getTimePhaseLabelBn(): string {
    switch (this.getTimePhase()) {
      case 'dawn':
        return 'ভোর';
      case 'morning':
        return 'সকাল';
      case 'day':
        return 'দুপুর';
      case 'afternoon':
        return 'বিকেল';
      case 'evening':
        return 'সন্ধ্যা';
      case 'night':
        return 'রাত';
    }
  }

  public isNight(): boolean {
    return this.data.timeOfDay >= 18.8 || this.data.timeOfDay < 5.4;
  }

  public isDuskOrDawn(): boolean {
    const t = this.data.timeOfDay;
    return (t >= 17.2 && t < 18.8) || (t >= 5.2 && t < 6.9);
  }

  public isRaining(): boolean {
    const w = this.data.weather;
    return w === 'light_rain' || w === 'heavy_rain' || w === 'thunderstorm';
  }

  public formatTime(): string {
    const totalMins = Math.floor((((this.data.timeOfDay % 24) + 24) % 24) * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  }
}
