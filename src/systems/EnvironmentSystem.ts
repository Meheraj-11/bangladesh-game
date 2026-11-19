import * as THREE from 'three';
import { WeatherType } from '../types';
import { GameStateManager } from '../state/GameState';

export interface EnvironmentCallbacks {
  onPowerChange: (powerOn: boolean) => void;
  onWeatherChange: (weather: WeatherType, prev: WeatherType) => void;
  onThunderFlash: () => void;
}

export interface WeatherMeta {
  icon: string;
  labelBn: string;
  targetCloud: number;
  targetRain: number;
  targetWind: number;
}

export const WEATHER_META: Record<WeatherType, WeatherMeta> = {
  clear: {
    icon: '☀️',
    labelBn: 'পরিষ্কার',
    targetCloud: 0.0,
    targetRain: 0.0,
    targetWind: 0.18
  },
  cloudy: {
    icon: '⛅',
    labelBn: 'মেঘলা',
    targetCloud: 0.58,
    targetRain: 0.0,
    targetWind: 0.42
  },
  light_rain: {
    icon: '🌦️',
    labelBn: 'হালকা বৃষ্টি',
    targetCloud: 0.78,
    targetRain: 0.48,
    targetWind: 0.62
  },
  heavy_rain: {
    icon: '🌧️',
    labelBn: 'ভারী বৃষ্টি',
    targetCloud: 0.92,
    targetRain: 0.85,
    targetWind: 0.82
  },
  thunderstorm: {
    icon: '⛈️',
    labelBn: 'ঝড়-বৃষ্টি',
    targetCloud: 1.0,
    targetRain: 1.0,
    targetWind: 1.0
  }
};

/**
 * Unified Automatic Environment Controller:
 * 1. Continuous 24h Day-Night Cycle (Morning -> Day -> Afternoon -> Evening -> Night -> Morning)
 * 2. Smooth Natural Weather System (Clear / Cloudy / Light Rain / Heavy Rain / Thunderstorm)
 * 3. Automatic Bangladeshi Electricity & Load Shedding / Auto-Restoration System
 */
export class EnvironmentSystem {
  public cloudiness = 0;
  public rainIntensity = 0;
  public windStrength = 0.18;
  public groundWetness = 0;
  public lightningFlash = 0;

  // Non-conflicting independent automatic schedulers (seconds)
  private weatherTimer = 55;
  private powerTimer = 65;
  private thunderTimer = 14;

  // Reusable scratch colors to avoid per-frame allocations
  private readonly cNight = new THREE.Color();
  private readonly cDawn = new THREE.Color();
  private readonly cDay = new THREE.Color();
  private readonly cAfternoon = new THREE.Color();
  private readonly cDusk = new THREE.Color();
  private readonly cCloudyTint = new THREE.Color();
  private readonly cLightning = new THREE.Color(0xe2e8f0);
  public readonly skyColor = new THREE.Color();

  constructor(private readonly stateMgr: GameStateManager) {
    const meta = WEATHER_META[stateMgr.data.weather];
    this.cloudiness = meta.targetCloud;
    this.rainIntensity = meta.targetRain;
    this.windStrength = meta.targetWind;
    this.groundWetness = meta.targetRain > 0 ? 0.65 : 0;
    this.weatherTimer = 42 + Math.random() * 38;
    this.powerTimer = stateMgr.data.powerOn
      ? 52 + Math.random() * 44
      : 35 + Math.random() * 25;
  }

  public syncFromState(): void {
    const meta = WEATHER_META[this.stateMgr.data.weather];
    this.cloudiness = meta.targetCloud;
    this.rainIntensity = meta.targetRain;
    this.windStrength = meta.targetWind;
    this.groundWetness = meta.targetRain > 0 ? 0.7 : 0;
    this.powerTimer = this.stateMgr.data.powerOn
      ? 55 + Math.random() * 45
      : 35 + Math.random() * 25;
  }

  public update(dt: number, cb: EnvironmentCallbacks): void {
    const s = this.stateMgr.data;

    // 1. FULLY AUTOMATIC 24-HOUR DAY-NIGHT CYCLE
    // ~1 game hour every ~28 real seconds -> full 24h cycle in ~11 minutes
    s.timeOfDay = (s.timeOfDay + dt * 0.036) % 24;

    // 2. FULLY AUTOMATIC WEATHER SYSTEM
    this.weatherTimer -= dt;
    if (this.weatherTimer <= 0) {
      const prev = s.weather;
      const next = this.pickNextWeather(prev);
      s.weather = next;
      this.weatherTimer = this.durationForWeather(next);
      if (next !== prev) {
        cb.onWeatherChange(next, prev);
      }
    }

    const meta = WEATHER_META[s.weather];
    this.cloudiness = THREE.MathUtils.lerp(this.cloudiness, meta.targetCloud, Math.min(1, dt * 0.25));
    this.rainIntensity = THREE.MathUtils.lerp(this.rainIntensity, meta.targetRain, Math.min(1, dt * 0.35));
    this.windStrength = THREE.MathUtils.lerp(this.windStrength, meta.targetWind, Math.min(1, dt * 0.3));

    // Ground becomes wet quickly in rain and gradually dries when clear/cloudy
    if (this.rainIntensity > 0.08) {
      this.groundWetness = Math.min(1, this.groundWetness + dt * (0.08 + this.rainIntensity * 0.14));
    } else {
      this.groundWetness = Math.max(0, this.groundWetness - dt * 0.045);
    }

    // Thunder & lightning during thunderstorms (and rare rumble during heavy rain)
    if (s.weather === 'thunderstorm' || s.weather === 'heavy_rain') {
      this.thunderTimer -= dt;
      if (this.thunderTimer <= 0) {
        const chance = s.weather === 'thunderstorm' ? 0.92 : 0.3;
        if (Math.random() < chance) {
          this.lightningFlash = s.weather === 'thunderstorm' ? 1.0 : 0.55;
          cb.onThunderFlash();
        }
        this.thunderTimer =
          s.weather === 'thunderstorm'
            ? 9 + Math.random() * 14
            : 20 + Math.random() * 18;
      }
    }
    if (this.lightningFlash > 0) {
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.4);
    }

    // 3. FULLY AUTOMATIC ELECTRICITY & LOAD SHEDDING SYSTEM
    this.powerTimer -= dt;
    if (this.powerTimer <= 0) {
      if (s.powerOn) {
        // Higher outage likelihood during hot afternoon, evening peak, night, or thunderstorm
        const phase = this.stateMgr.getTimePhase();
        let outageChance = 0.52;
        if (phase === 'evening' || phase === 'night') outageChance = 0.78;
        else if (phase === 'afternoon' || s.weather === 'thunderstorm') outageChance = 0.72;

        if (Math.random() < outageChance) {
          s.powerOn = false;
          this.powerTimer = 38 + Math.random() * 34; // Automatic restoration after 38–72s
          cb.onPowerChange(false);
        } else {
          this.powerTimer = 45 + Math.random() * 35;
        }
      } else {
        // Automatic electricity restoration!
        s.powerOn = true;
        s.loadSheddingSurvived += 1;
        this.powerTimer = 68 + Math.random() * 52; // Normal electricity for 68–120s
        cb.onPowerChange(true);
      }
    }
  }

  private pickNextWeather(current: WeatherType): WeatherType {
    const r = Math.random();
    switch (current) {
      case 'clear':
        return r < 0.45 ? 'clear' : r < 0.88 ? 'cloudy' : 'light_rain';
      case 'cloudy':
        if (r < 0.34) return 'clear';
        if (r < 0.52) return 'cloudy';
        if (r < 0.84) return 'light_rain';
        return 'heavy_rain';
      case 'light_rain':
        if (r < 0.36) return 'cloudy';
        if (r < 0.68) return 'heavy_rain';
        if (r < 0.84) return 'thunderstorm';
        return 'clear';
      case 'heavy_rain':
        if (r < 0.35) return 'thunderstorm';
        if (r < 0.78) return 'light_rain';
        return 'cloudy';
      case 'thunderstorm':
        if (r < 0.62) return 'heavy_rain';
        return 'light_rain';
    }
  }

  private durationForWeather(w: WeatherType): number {
    switch (w) {
      case 'clear':
        return 58 + Math.random() * 48;
      case 'cloudy':
        return 40 + Math.random() * 35;
      case 'light_rain':
        return 42 + Math.random() * 34;
      case 'heavy_rain':
        return 38 + Math.random() * 30;
      case 'thunderstorm':
        return 32 + Math.random() * 26;
    }
  }

  /**
   * Computes smooth, realistic sky, sun, ambient, and fog lighting factors for the current 24h time + weather.
   */
  public computeLighting(powerOn: boolean): {
    dayFactor: number;
    duskFactor: number;
    dawnFactor: number;
    sunElevation: number;
    sunAngle: number;
    sunIntensity: number;
    sunColorHex: number;
    hemiIntensity: number;
    ambientIntensity: number;
    fogDensity: number;
    streetLightsShouldGlow: boolean;
    houseWindowsShouldGlow: boolean;
    starsOpacity: number;
  } {
    const t = this.stateMgr.data.timeOfDay;
    const isNight = this.stateMgr.isNight();

    // Smooth daylight curve (0 at night, 1 at solar noon)
    let dayFactor = 0;
    if (t >= 5.3 && t <= 18.9) {
      dayFactor = Math.sin(((t - 5.3) / 13.6) * Math.PI);
    }

    const dawnFactor =
      t >= 5.0 && t <= 7.2 ? Math.sin(((t - 5.0) / 2.2) * Math.PI) : 0;
    const duskFactor =
      t >= 16.6 && t <= 19.2 ? Math.sin(((t - 16.6) / 2.6) * Math.PI) : 0;
    const afternoonFactor =
      t >= 14.8 && t <= 17.6 ? Math.sin(((t - 14.8) / 2.8) * Math.PI) : 0;

    // Sky palette for warm authentic Bangladeshi daylight, golden afternoon, crimson dusk, moonlit night
    this.cNight.setHex(powerOn ? 0x0b1629 : 0x040912);
    this.cDawn.setHex(0xf3a683);
    this.cDay.setHex(0x7cc4f5);
    this.cAfternoon.setHex(0xf6c98e);
    this.cDusk.setHex(0xee8555);

    this.skyColor.copy(this.cNight).lerp(this.cDay, dayFactor);
    if (afternoonFactor > 0) this.skyColor.lerp(this.cAfternoon, afternoonFactor * 0.28);
    if (dawnFactor > 0) this.skyColor.lerp(this.cDawn, dawnFactor * 0.62);
    if (duskFactor > 0) this.skyColor.lerp(this.cDusk, duskFactor * 0.68);

    // Cloud & rain sky overcast damping
    this.cCloudyTint.setHex(isNight ? 0x0f172a : 0x5d6e7e);
    this.skyColor.lerp(this.cCloudyTint, this.cloudiness * (isNight ? 0.45 : 0.68));

    // Lightning sky flash
    if (this.lightningFlash > 0) {
      this.skyColor.lerp(this.cLightning, this.lightningFlash * 0.62);
    }

    const sunAngle = ((t - 5.5) / 13.0) * Math.PI;
    const sunElevation = Math.max(0.14, Math.sin(Math.max(0, Math.min(Math.PI, sunAngle))));
    const weatherDim = 1.0 - this.cloudiness * 0.44 - this.rainIntensity * 0.14;

    const sunIntensity =
      (0.16 + dayFactor * 1.48) * weatherDim + this.lightningFlash * 1.9;

    let sunColorHex = 0xfff2d8;
    if (isNight) sunColorHex = 0x89b0e6;
    else if (duskFactor > 0.3 || dawnFactor > 0.35) sunColorHex = 0xffae66;
    else if (afternoonFactor > 0.4) sunColorHex = 0xffe4b0;

    const hemiIntensity = (0.16 + dayFactor * 0.64) * weatherDim;
    const ambientIntensity = isNight
      ? (powerOn ? 0.14 : 0.055)
      : 0.27 * weatherDim;

    const fogDensity =
      0.0072 +
      this.cloudiness * 0.0038 +
      this.rainIntensity * 0.0085 +
      (isNight ? 0.004 : 0);

    const darkEnoughForLights = isNight || duskFactor > 0.28 || dawnFactor > 0.45 || this.rainIntensity > 0.65;
    const streetLightsShouldGlow = powerOn && darkEnoughForLights;
    const houseWindowsShouldGlow = powerOn && (isNight || duskFactor > 0.22 || this.rainIntensity > 0.55);
    const starsOpacity = isNight ? Math.max(0, (1 - this.cloudiness * 1.15) * 0.9) : 0;

    return {
      dayFactor,
      duskFactor,
      dawnFactor,
      sunElevation,
      sunAngle,
      sunIntensity,
      sunColorHex,
      hemiIntensity,
      ambientIntensity,
      fogDensity,
      streetLightsShouldGlow,
      houseWindowsShouldGlow,
      starsOpacity
    };
  }
}
