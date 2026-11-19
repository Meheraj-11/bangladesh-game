/**
 * Authentic Bangladeshi Procedural Web Audio Sound Engine
 * Preserves and upgrades all environmental sounds:
 * - Rickshaw bells, birds/koel, nighttime crickets, frogs, distant chatter
 * - Continuous rain intensity modulation (light drizzle -> heavy rain -> thunderstorm)
 * - Rolling thunder, RPM-linked ceiling fan, emergency fan, electricity switch clack
 * - Match strike, mosquito buzz, tea pour/sip, biscuit crunch, tube-well water splash
 * - Occasional distant শিয়ালের ডাক (Jackal Call) during nighttime, especially after load shedding
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  public muted = false;
  private initialized = false;

  // Continuous bed nodes
  private ceilingFanGain: GainNode | null = null;
  private ceilingFanFilter: BiquadFilterNode | null = null;
  private emergencyFanGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private nightBedGain: GainNode | null = null;
  private chatterGain: GainNode | null = null;
  private mosquitoGain: GainNode | null = null;
  private mosquitoOsc: OscillatorNode | null = null;

  // Event scheduler timers (seconds)
  private rickshawTimer = 9;
  private birdTimer = 4;
  private cricketTimer = 1.5;
  private frogTimer = 5;
  private jackalTimer = 26;
  private lastPowerOn = true;

  public init(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.72;
      this.masterGain.connect(this.ctx.destination);

      const sr = this.ctx.sampleRate;
      const len = Math.floor(sr * 2.5);
      this.noiseBuffer = this.ctx.createBuffer(1, len, sr);
      const data = this.noiseBuffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        data[i] = (b0 + b1 + b2 + white * 0.08) * 1.4;
      }

      this.setupContinuousBeds();
      this.initialized = true;
    } catch {
      // Ignore audio hardware init failures cleanly
    }
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx && this.ctx.state === 'running') {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.72, this.ctx.currentTime, 0.08);
    }
  }

  private ready(): boolean {
    return Boolean(this.initialized && this.ctx && this.masterGain && this.ctx.state === 'running');
  }

  private setupContinuousBeds(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    const fanSrc = this.ctx.createBufferSource();
    fanSrc.buffer = this.noiseBuffer;
    fanSrc.loop = true;
    this.ceilingFanFilter = this.ctx.createBiquadFilter();
    this.ceilingFanFilter.type = 'bandpass';
    this.ceilingFanFilter.frequency.value = 115;
    this.ceilingFanFilter.Q.value = 1.6;
    this.ceilingFanGain = this.ctx.createGain();
    this.ceilingFanGain.gain.value = 0;
    fanSrc.connect(this.ceilingFanFilter).connect(this.ceilingFanGain).connect(this.masterGain);
    fanSrc.start();

    const eFanSrc = this.ctx.createBufferSource();
    eFanSrc.buffer = this.noiseBuffer;
    eFanSrc.loop = true;
    const eFilter = this.ctx.createBiquadFilter();
    eFilter.type = 'bandpass';
    eFilter.frequency.value = 340;
    eFilter.Q.value = 2.2;
    this.emergencyFanGain = this.ctx.createGain();
    this.emergencyFanGain.gain.value = 0;
    eFanSrc.connect(eFilter).connect(this.emergencyFanGain).connect(this.masterGain);
    eFanSrc.start();

    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = this.noiseBuffer;
    rainSrc.loop = true;
    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = 'bandpass';
    this.rainFilter.frequency.value = 1350;
    this.rainFilter.Q.value = 0.55;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    rainSrc.connect(this.rainFilter).connect(this.rainGain).connect(this.masterGain);
    rainSrc.start();

    const nightSrc = this.ctx.createBufferSource();
    nightSrc.buffer = this.noiseBuffer;
    nightSrc.loop = true;
    const nightFilter = this.ctx.createBiquadFilter();
    nightFilter.type = 'lowpass';
    nightFilter.frequency.value = 420;
    this.nightBedGain = this.ctx.createGain();
    this.nightBedGain.gain.value = 0;
    nightSrc.connect(nightFilter).connect(this.nightBedGain).connect(this.masterGain);
    nightSrc.start();

    const chatSrc = this.ctx.createBufferSource();
    chatSrc.buffer = this.noiseBuffer;
    chatSrc.loop = true;
    const chatFilter = this.ctx.createBiquadFilter();
    chatFilter.type = 'bandpass';
    chatFilter.frequency.value = 620;
    chatFilter.Q.value = 2.8;
    this.chatterGain = this.ctx.createGain();
    this.chatterGain.gain.value = 0;
    chatSrc.connect(chatFilter).connect(this.chatterGain).connect(this.masterGain);
    chatSrc.start();

    this.mosquitoOsc = this.ctx.createOscillator();
    this.mosquitoOsc.type = 'sawtooth';
    this.mosquitoOsc.frequency.value = 640;
    const mFilter = this.ctx.createBiquadFilter();
    mFilter.type = 'bandpass';
    mFilter.frequency.value = 720;
    mFilter.Q.value = 5.5;
    this.mosquitoGain = this.ctx.createGain();
    this.mosquitoGain.gain.value = 0;
    this.mosquitoOsc.connect(mFilter).connect(this.mosquitoGain).connect(this.masterGain);
    this.mosquitoOsc.start();
  }

  public update(params: {
    dt: number;
    elapsed: number;
    isNight: boolean;
    rainIntensity: number; // 0..1 smooth automatic rain intensity
    powerOn: boolean;
    insideMess: boolean;
    nearTongOrCrowd: boolean;
    ceilingFanRpm: number;
    emergencyFanOn: boolean;
    mosquitoesActive: boolean;
  }): void {
    if (!this.ready() || !this.ctx) return;

    const now = this.ctx.currentTime;
    const {
      dt,
      elapsed,
      isNight,
      rainIntensity,
      powerOn,
      insideMess,
      nearTongOrCrowd,
      ceilingFanRpm,
      emergencyFanOn,
      mosquitoesActive
    } = params;

    const isRaining = rainIntensity > 0.12;

    if (this.lastPowerOn && !powerOn && isNight) {
      this.jackalTimer = Math.min(this.jackalTimer, 9 + Math.random() * 11);
    }
    this.lastPowerOn = powerOn;

    if (this.ceilingFanGain && this.ceilingFanFilter) {
      const fanAudibility = insideMess ? 0.22 : 0.025;
      const mod = 0.85 + 0.15 * Math.sin(elapsed * (6 + ceilingFanRpm * 16));
      this.ceilingFanGain.gain.setTargetAtTime(ceilingFanRpm * fanAudibility * mod, now, 0.12);
      this.ceilingFanFilter.frequency.setTargetAtTime(70 + ceilingFanRpm * 95, now, 0.15);
    }

    if (this.emergencyFanGain) {
      const eTarget = emergencyFanOn ? (insideMess ? 0.12 : 0.015) : 0;
      this.emergencyFanGain.gain.setTargetAtTime(eTarget, now, 0.15);
    }

    // Smooth variable rain volume (light drizzle -> heavy downpour)
    if (this.rainGain && this.rainFilter) {
      const rScale = insideMess ? 0.18 : 0.3;
      this.rainGain.gain.setTargetAtTime(rainIntensity * rScale, now, 0.35);
      this.rainFilter.frequency.setTargetAtTime(
        (insideMess ? 780 : 1280) + rainIntensity * 340,
        now,
        0.35
      );
    }

    if (this.nightBedGain) {
      const nTarget = isNight ? (insideMess ? 0.04 : 0.095) : 0.014;
      this.nightBedGain.gain.setTargetAtTime(nTarget, now, 0.5);
    }

    if (this.chatterGain) {
      const chatMod = 0.7 + 0.3 * Math.sin(elapsed * 2.3) * Math.cos(elapsed * 1.1);
      const baseChat = nearTongOrCrowd ? 0.068 : insideMess ? 0.008 : 0.026;
      const quietFactor = (isNight ? 0.65 : 1.0) * (1 - rainIntensity * 0.45);
      this.chatterGain.gain.setTargetAtTime(baseChat * quietFactor * chatMod, now, 0.25);
    }

    if (this.mosquitoGain && this.mosquitoOsc) {
      const mTarget = mosquitoesActive && insideMess ? 0.026 : 0;
      this.mosquitoGain.gain.setTargetAtTime(mTarget, now, 0.2);
      if (mTarget > 0) {
        this.mosquitoOsc.frequency.setTargetAtTime(
          610 + Math.sin(elapsed * 5.2) * 55 + Math.cos(elapsed * 13) * 18,
          now,
          0.05
        );
      }
    }

    // Periodic Rickshaw Bells
    this.rickshawTimer -= dt;
    if (this.rickshawTimer <= 0) {
      this.playRickshawBell(insideMess ? 0.065 : 0.13);
      this.rickshawTimer = isNight ? 28 + Math.random() * 26 : 11 + Math.random() * 14;
    }

    // Daytime Birds & Koel
    if (!isNight && !isRaining) {
      this.birdTimer -= dt;
      if (this.birdTimer <= 0) {
        this.playBirdCall(insideMess ? 0.045 : 0.09);
        this.birdTimer = 5 + Math.random() * 8;
      }
    }

    // Nighttime Crickets
    if (isNight) {
      this.cricketTimer -= dt;
      if (this.cricketTimer <= 0) {
        this.playCricketChirp(insideMess ? 0.032 : 0.065);
        this.cricketTimer = 1.4 + Math.random() * 2.2;
      }
    }

    // Frogs during night or rain
    if (isNight || isRaining) {
      this.frogTimer -= dt;
      if (this.frogTimer <= 0) {
        this.playFrogCroak(insideMess ? 0.035 : 0.075);
        this.frogTimer = (isRaining ? 4 : 7) + Math.random() * 7;
      }
    }

    // Occasional distant শিয়ালের ডাক (Jackal Call) during nighttime, especially after load shedding
    if (isNight) {
      this.jackalTimer -= dt;
      if (this.jackalTimer <= 0) {
        const shouldCall = !powerOn ? Math.random() < 0.85 : Math.random() < 0.48;
        if (shouldCall) {
          this.playDistantJackalCall(insideMess ? 0.085 : 0.125);
        }
        this.jackalTimer = !powerOn ? 34 + Math.random() * 34 : 52 + Math.random() * 44;
      }
    }
  }

  public playRickshawBell(volume = 0.13): void {
    if (!this.ready() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 1.6;
    pan.connect(this.masterGain);

    for (let strike = 0; strike < 2; strike++) {
      const t0 = now + strike * 0.14;
      for (const [freq, amp] of [
        [2380, 1.0],
        [4780, 0.45],
        [7120, 0.2]
      ]) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 35, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.001, volume * amp), t0 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
        osc.connect(g).connect(pan);
        osc.start(t0);
        osc.stop(t0 + 0.45);
      }
    }
  }

  private playBirdCall(volume = 0.08): void {
    if (!this.ready() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 1.4;
    pan.connect(this.masterGain);

    if (Math.random() < 0.45) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(860, now);
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.24);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.42);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(volume, now + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.46);
      osc.connect(g).connect(pan);
      osc.start(now);
      osc.stop(now + 0.48);
    } else {
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const t = now + i * 0.12;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        const f = 2600 + Math.random() * 900;
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 1.25, t + 0.05);
        osc.frequency.exponentialRampToValueAtTime(f * 0.85, t + 0.09);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(volume * 0.7, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        osc.connect(g).connect(pan);
        osc.start(t);
        osc.stop(t + 0.11);
      }
    }
  }

  private playCricketChirp(volume = 0.05): void {
    if (!this.ready() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 1.7;
    pan.connect(this.masterGain);

    const pulses = 3 + Math.floor(Math.random() * 3);
    const baseFreq = 4100 + Math.random() * 550;
    for (let i = 0; i < pulses; i++) {
      const t = now + i * 0.065;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(volume, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.052);
      osc.connect(g).connect(pan);
      osc.start(t);
      osc.stop(t + 0.056);
    }
  }

  private playFrogCroak(volume = 0.06): void {
    if (!this.ready() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 1.5;
    pan.connect(this.masterGain);

    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.24;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(165 + Math.random() * 30, t);
      osc.frequency.exponentialRampToValueAtTime(115, t + 0.16);
      filter.type = 'bandpass';
      filter.frequency.value = 390;
      filter.Q.value = 4.5;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(volume, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(filter).connect(g).connect(pan);
      osc.start(t);
      osc.stop(t + 0.19);
    }
  }

  public playDistantJackalCall(volume = 0.11): void {
    if (!this.ready() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const side = Math.random() < 0.5 ? -1 : 1;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = side * (0.55 + Math.random() * 0.38);

    const distLP = this.ctx.createBiquadFilter();
    distLP.type = 'lowpass';
    distLP.frequency.value = 1350 + Math.random() * 300;

    const echoDelay = this.ctx.createDelay();
    echoDelay.delayTime.value = 0.26;
    const echoGain = this.ctx.createGain();
    echoGain.gain.value = 0.28;

    distLP.connect(pan);
    distLP.connect(echoDelay);
    echoDelay.connect(echoGain).connect(pan);
    pan.connect(this.masterGain);

    const voiceCount = 2 + Math.floor(Math.random() * 2);
    for (let v = 0; v < voiceCount; v++) {
      const startOffset = v === 0 ? 0 : 0.7 + v * 0.55 + Math.random() * 0.45;
      const pitchScale = 0.9 + Math.random() * 0.24;
      const vGainScale = v === 0 ? 1.0 : 0.68;

      const phrases = v === 0 ? 3 : 2;
      let cursor = now + startOffset;
      for (let p = 0; p < phrases; p++) {
        const dur = p === phrases - 1 ? 0.92 : 0.46;
        const osc = this.ctx.createOscillator();
        const oscHarm = this.ctx.createOscillator();
        const formant = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();

        osc.type = 'sawtooth';
        oscHarm.type = 'triangle';

        const baseF = (p === phrases - 1 ? 470 : 540) * pitchScale;
        const peakF = (p === phrases - 1 ? 760 : 840) * pitchScale;
        const endF = (p === phrases - 1 ? 370 : 460) * pitchScale;

        osc.frequency.setValueAtTime(baseF, cursor);
        osc.frequency.exponentialRampToValueAtTime(peakF, cursor + dur * 0.34);
        osc.frequency.exponentialRampToValueAtTime(peakF * 0.94, cursor + dur * 0.56);
        osc.frequency.exponentialRampToValueAtTime(endF, cursor + dur);

        oscHarm.frequency.setValueAtTime(baseF * 1.5, cursor);
        oscHarm.frequency.exponentialRampToValueAtTime(peakF * 1.5, cursor + dur * 0.34);
        oscHarm.frequency.exponentialRampToValueAtTime(endF * 1.5, cursor + dur);

        formant.type = 'bandpass';
        formant.frequency.setValueAtTime(820 * pitchScale, cursor);
        formant.frequency.linearRampToValueAtTime(1180 * pitchScale, cursor + dur * 0.38);
        formant.frequency.linearRampToValueAtTime(680 * pitchScale, cursor + dur);
        formant.Q.value = 3.6;

        g.gain.setValueAtTime(0.0001, cursor);
        g.gain.linearRampToValueAtTime(volume * vGainScale, cursor + dur * 0.18);
        g.gain.linearRampToValueAtTime(volume * vGainScale * 0.72, cursor + dur * 0.65);
        g.gain.exponentialRampToValueAtTime(0.0001, cursor + dur + 0.04);

        const harmGain = this.ctx.createGain();
        harmGain.gain.value = 0.28;

        osc.connect(formant);
        oscHarm.connect(harmGain).connect(formant);
        formant.connect(g).connect(distLP);

        osc.start(cursor);
        oscHarm.start(cursor);
        osc.stop(cursor + dur + 0.06);
        oscHarm.stop(cursor + dur + 0.06);

        cursor += dur + 0.09 + Math.random() * 0.06;
      }
    }
  }

  public playThunder(): void {
    if (!this.ready() || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(65, now + 2.8);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.45, now + 0.14);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 3.1);

    src.connect(filter).connect(g).connect(this.masterGain);
    src.start(now);
    src.stop(now + 3.2);
  }

  public playPowerSwitch(turningOn: boolean): void {
    if (!this.ready() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(turningOn ? 240 : 180, now);
    osc.frequency.exponentialRampToValueAtTime(turningOn ? 520 : 52, now + 0.18);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(g).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);

    if (!turningOn) {
      const hum = this.ctx.createOscillator();
      const hg = this.ctx.createGain();
      hum.type = 'triangle';
      hum.frequency.setValueAtTime(100, now);
      hum.frequency.exponentialRampToValueAtTime(34, now + 0.9);
      hg.gain.setValueAtTime(0.14, now);
      hg.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
      hum.connect(hg).connect(this.masterGain);
      hum.start(now);
      hum.stop(now + 1.0);
    }
  }

  public playMatchStrike(): void {
    if (!this.ready() || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 1800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    src.connect(f).connect(g).connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.24);
  }

  public playWaterSplash(): void {
    if (!this.ready() || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(900, now);
    f.frequency.exponentialRampToValueAtTime(1950, now + 0.45);
    f.Q.value = 1.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.24, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    src.connect(f).connect(g).connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.58);
  }

  public playClick(pitch = 680): void {
    if (!this.ready() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.35, now + 0.06);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(g).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playTeaSip(): void {
    if (!this.ready() || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(700, now);
    f.frequency.linearRampToValueAtTime(1450, now + 0.35);
    f.Q.value = 3.0;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    src.connect(f).connect(g).connect(this.masterGain);
    src.start(now);
    src.stop(now + 0.45);
  }

  public playBiscuitCrunch(): void {
    if (!this.ready() || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.14;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2100;
      f.Q.value = 1.2;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      src.connect(f).connect(g).connect(this.masterGain);
      src.start(t);
      src.stop(t + 0.11);
    }
  }

  /**
   * Authentic vehicle horns:
   * - Truck / Bus deep dual air horn (pitch ~ 240)
   * - CNG Auto-rickshaw peppy double-pip (pitch ~ 520)
   * - Private Car / Taxi dual-tone beep (pitch ~ 440)
   */
  public playVehicleHorn(pitch = 440, length = 0.16): void {
    if (!this.ready() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Truck / Pickup deep dual air horn
    if (pitch < 300) {
      for (const f of [pitch, pitch * 1.26]) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(750, now);

        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.2, now + 0.02);
        g.gain.setValueAtTime(0.2, now + length + 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, now + length + 0.18);

        osc.connect(filter).connect(g).connect(this.masterGain);
        osc.start(now);
        osc.stop(now + length + 0.2);
      }
      return;
    }

    // CNG / Scooter peppy double-pip
    if (pitch > 490) {
      for (let burst = 0; burst < 2; burst++) {
        const t0 = now + burst * 0.11;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch, t0);
        osc.frequency.exponentialRampToValueAtTime(pitch * 0.96, t0 + 0.07);

        g.gain.setValueAtTime(0.001, t0);
        g.gain.linearRampToValueAtTime(0.18, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);

        osc.connect(g).connect(this.masterGain);
        osc.start(t0);
        osc.stop(t0 + 0.09);
      }
      return;
    }

    // Standard Car / Sedan dual-tone horn
    for (const f of [pitch, pitch * 1.25]) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(f * 1.1, now);
      filter.Q.value = 2.4;

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.16, now + 0.02);
      g.gain.setValueAtTime(0.16, now + length);
      g.gain.exponentialRampToValueAtTime(0.0001, now + length + 0.06);

      osc.connect(filter).connect(g).connect(this.masterGain);
      osc.start(now);
      osc.stop(now + length + 0.08);
    }
  }
}
