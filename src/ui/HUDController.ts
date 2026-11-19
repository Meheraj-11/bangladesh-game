import { ActionButtonSpec, Interactable, MapLocationDetail, SaveData } from '../types';
import { WEATHER_META } from '../systems/EnvironmentSystem';

export interface HUDHandlers {
  onStartNew: () => void;
  onContinue: () => void;
  onResume: () => void;
  onSaveNow: () => void;
  onResetSave: () => void;
  onToggleTouchUI: () => void;
  onToggleAudio: () => void;
  onTogglePause: () => void;
  onToggleFullMap: () => void;
  onCloseDialogue: () => void;
  onPromptClick: () => void;
}

export class HUDController {
  private readonly hudEl = document.getElementById('hud')!;
  private readonly startScreenEl = document.getElementById('start-screen')!;
  private readonly btnContinue = document.getElementById('btn-continue')!;
  private readonly pauseModalEl = document.getElementById('pause-modal')!;
  private readonly fullMapModalEl = document.getElementById('fullmap-modal')!;
  private readonly dialogueModalEl = document.getElementById('dialogue-modal')!;
  private readonly mobileControlsEl = document.getElementById('mobile-controls')!;

  private readonly locationPill = document.getElementById('location-pill')!;
  private readonly timeIcon = document.getElementById('time-icon')!;
  private readonly timeText = document.getElementById('time-text')!;
  private readonly weatherIcon = document.getElementById('weather-icon')!;
  private readonly weatherText = document.getElementById('weather-text')!;
  private readonly powerChip = document.getElementById('power-chip')!;
  private readonly powerIcon = document.getElementById('power-icon')!;
  private readonly powerText = document.getElementById('power-text')!;
  private readonly tempText = document.getElementById('temp-text')!;
  private readonly moneyText = document.getElementById('money-text')!;

  private readonly barEnergy = document.getElementById('bar-energy')!;
  private readonly valEnergy = document.getElementById('val-energy')!;
  private readonly barComfort = document.getElementById('bar-comfort')!;
  private readonly valComfort = document.getElementById('val-comfort')!;
  private readonly barPhone = document.getElementById('bar-phone')!;
  private readonly valPhone = document.getElementById('val-phone')!;

  private readonly btnAudio = document.getElementById('btn-toggle-audio')!;

  private readonly statusBadges = document.getElementById('status-badges')!;
  private readonly toastContainer = document.getElementById('toast-container')!;
  private readonly interactPrompt = document.getElementById('interact-prompt')!;
  private readonly interactPromptText = document.getElementById('interact-prompt-text')!;
  private readonly actionButtonsBar = document.getElementById('action-buttons-bar')!;

  private readonly dialogueAvatar = document.getElementById('dialogue-avatar')!;
  private readonly dialogueName = document.getElementById('dialogue-name')!;
  private readonly dialogueRole = document.getElementById('dialogue-role')!;
  private readonly dialogueText = document.getElementById('dialogue-text')!;
  private readonly dialogueActions = document.getElementById('dialogue-actions')!;

  // Location Information Panel elements on Full Map
  private readonly mapLocationPanel = document.getElementById('map-location-panel');
  private readonly locPanelIcon = document.getElementById('loc-panel-icon');
  private readonly locPanelNameBn = document.getElementById('loc-panel-name-bn');
  private readonly locPanelNameEn = document.getElementById('loc-panel-name-en');
  private readonly locPanelCategory = document.getElementById('loc-panel-category');
  private readonly locPanelClose = document.getElementById('btn-close-location-panel');
  private readonly locPanelDesc = document.getElementById('loc-panel-desc');
  private readonly locPanelCoords = document.getElementById('loc-panel-coords');
  private readonly locPanelDistance = document.getElementById('loc-panel-distance');
  private readonly locPanelAccess = document.getElementById('loc-panel-access');

  private lastActionKey = '';
  public touchUIVisible = false;

  constructor(handlers: HUDHandlers, hasSave: boolean) {
    if (hasSave) {
      this.btnContinue.classList.remove('hidden');
    }

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.setTouchUIVisible(isTouch);

    document.getElementById('btn-play')?.addEventListener('click', handlers.onStartNew);
    this.btnContinue.addEventListener('click', handlers.onContinue);
    document.getElementById('btn-resume')?.addEventListener('click', handlers.onResume);
    document.getElementById('btn-save-now')?.addEventListener('click', handlers.onSaveNow);
    document.getElementById('btn-reset-save')?.addEventListener('click', handlers.onResetSave);
    document.getElementById('btn-toggle-touch-ui')?.addEventListener('click', handlers.onToggleTouchUI);

    this.btnAudio.addEventListener('click', handlers.onToggleAudio);
    document.getElementById('btn-pause')?.addEventListener('click', handlers.onTogglePause);
    document.getElementById('btn-expand-map')?.addEventListener('click', handlers.onToggleFullMap);
    document.getElementById('btn-close-fullmap')?.addEventListener('click', handlers.onToggleFullMap);
    document.getElementById('btn-close-dialogue')?.addEventListener('click', handlers.onCloseDialogue);
    this.locPanelClose?.addEventListener('click', () => this.hideLocationDetail());
    this.interactPrompt.addEventListener('click', handlers.onPromptClick);
  }

  public showGameHUD(): void {
    this.startScreenEl.classList.add('hidden');
    this.hudEl.classList.remove('hidden');
  }

  public setTouchUIVisible(visible: boolean): void {
    this.touchUIVisible = visible;
    this.mobileControlsEl.classList.toggle('visible', visible);
  }

  public setPauseVisible(visible: boolean): void {
    this.pauseModalEl.classList.toggle('hidden', !visible);
  }

  public setFullMapVisible(visible: boolean): void {
    this.fullMapModalEl.classList.toggle('hidden', !visible);
    if (!visible) {
      this.hideLocationDetail();
    }
  }

  public showLocationDetail(detail: MapLocationDetail): void {
    if (!this.mapLocationPanel) return;
    if (this.locPanelIcon) this.locPanelIcon.textContent = detail.icon;
    if (this.locPanelNameBn) this.locPanelNameBn.textContent = detail.nameBn;
    if (this.locPanelNameEn) this.locPanelNameEn.textContent = detail.nameEn;
    if (this.locPanelCategory) this.locPanelCategory.textContent = detail.categoryBn;
    if (this.locPanelDesc) this.locPanelDesc.textContent = detail.descriptionBn;
    if (this.locPanelCoords) {
      this.locPanelCoords.textContent = `X: ${detail.worldX.toFixed(1)}, Z: ${detail.worldZ.toFixed(1)}`;
    }
    if (this.locPanelDistance) {
      this.locPanelDistance.textContent = `${Math.round(detail.distance)} m (${detail.distance.toFixed(1)}m)`;
    }
    if (this.locPanelAccess) {
      this.locPanelAccess.textContent = detail.accessible ? 'উন্মুক্ত (Accessible)' : 'ব্যক্তিগত (Private)';
      this.locPanelAccess.className = detail.accessible ? 'meta-val meta-access-yes' : 'meta-val meta-access-no';
    }
    this.mapLocationPanel.classList.remove('hidden');
  }

  public updateLocationDistance(distMeters: number): void {
    if (
      this.locPanelDistance &&
      this.mapLocationPanel &&
      !this.mapLocationPanel.classList.contains('hidden')
    ) {
      this.locPanelDistance.textContent = `${Math.round(distMeters)} m (${distMeters.toFixed(1)}m)`;
    }
  }

  public hideLocationDetail(): void {
    this.mapLocationPanel?.classList.add('hidden');
  }

  public isLocationDetailOpen(): boolean {
    return Boolean(this.mapLocationPanel && !this.mapLocationPanel.classList.contains('hidden'));
  }

  public openDialogue(opts: {
    avatar: string;
    name: string;
    role: string;
    text: string;
    buttons: { label: string; primary?: boolean; onClick: () => void }[];
  }): void {
    this.dialogueAvatar.textContent = opts.avatar;
    this.dialogueName.textContent = opts.name;
    this.dialogueRole.textContent = opts.role;
    this.dialogueText.textContent = opts.text;
    this.dialogueActions.innerHTML = '';

    for (const b of opts.buttons) {
      const btn = document.createElement('button');
      btn.className = b.primary ? 'btn-primary' : 'btn-secondary';
      btn.textContent = b.label;
      btn.addEventListener('click', b.onClick);
      this.dialogueActions.appendChild(btn);
    }
    this.dialogueModalEl.classList.remove('hidden');
  }

  public updateDialogueContent(opts: {
    text: string;
    buttons: { label: string; primary?: boolean; onClick: () => void }[];
  }): void {
    this.dialogueText.textContent = opts.text;
    this.dialogueActions.innerHTML = '';
    for (const b of opts.buttons) {
      const btn = document.createElement('button');
      btn.className = b.primary ? 'btn-primary' : 'btn-secondary';
      btn.textContent = b.label;
      btn.addEventListener('click', b.onClick);
      this.dialogueActions.appendChild(btn);
    }
  }

  public closeDialogue(): void {
    this.dialogueModalEl.classList.add('hidden');
  }

  public isDialogueOpen(): boolean {
    return !this.dialogueModalEl.classList.contains('hidden');
  }

  public showToast(message: string, warn = false): void {
    // Keep at most 3 simultaneous toasts so UI never clutters
    while (this.toastContainer.children.length >= 3) {
      this.toastContainer.firstElementChild?.remove();
    }
    const el = document.createElement('div');
    el.className = warn ? 'toast warn' : 'toast';
    el.textContent = message;
    this.toastContainer.appendChild(el);
    window.setTimeout(() => el.remove(), 3500);
  }

  public updateStats(params: {
    state: SaveData;
    formattedTime: string;
    timePhaseBn: string;
    isNight: boolean;
    locationLabel: string;
    mosquitoesActive: boolean;
    muted: boolean;
  }): void {
    const {
      state,
      formattedTime,
      timePhaseBn,
      isNight,
      locationLabel,
      mosquitoesActive,
      muted
    } = params;

    this.locationPill.textContent = locationLabel;
    this.timeIcon.textContent = isNight ? '🌙' : timePhaseBn === 'ভোর' || timePhaseBn === 'সন্ধ্যা' ? '🌇' : '☀️';
    this.timeText.textContent = `${timePhaseBn} • ${formattedTime}`;

    const wMeta = WEATHER_META[state.weather];
    this.weatherIcon.textContent =
      state.weather === 'clear' && isNight ? '✨' : wMeta.icon;
    this.weatherText.textContent = wMeta.labelBn;

    this.powerChip.className = state.powerOn ? 'hud-chip power-on' : 'hud-chip power-off';
    this.powerIcon.textContent = state.powerOn ? '⚡' : '🕯️';
    this.powerText.textContent = state.powerOn ? 'বিদ্যুৎ আছে' : 'লোডশেডিং!';

    this.tempText.textContent = `${state.temperature.toFixed(1)}°C`;
    this.moneyText.textContent = `${Math.floor(state.money)}`;

    const e = Math.round(state.energy);
    const c = Math.round(state.comfort);
    const p = Math.round(state.phoneBattery);

    this.barEnergy.style.width = `${e}%`;
    this.valEnergy.textContent = `${e}%`;
    this.barComfort.style.width = `${c}%`;
    this.valComfort.textContent = `${c}%`;
    this.barPhone.style.width = `${p}%`;
    this.valPhone.textContent = `${p}%`;

    this.btnAudio.textContent = muted ? '🔇' : '🔊';

    const badges: { text: string; cls: string }[] = [];
    if (mosquitoesActive) badges.push({ text: '🦟 মশা কামড়াচ্ছে!', cls: 'warn' });
    if (state.temperature >= 33) badges.push({ text: '🥵 ভ্যাপসা গরম', cls: 'warn' });
    if (state.candleLit) badges.push({ text: '🕯️ মোমবাতি জ্বলছে', cls: 'good' });
    if (state.emergencyFanOn) {
      badges.push({
        text: `🌀 চার্জার ফ্যান (${Math.round(state.emergencyFanBattery)}%)`,
        cls: 'good'
      });
    }
    if (state.mosquitoCoilLit) badges.push({ text: '💨 কয়েল চলছে', cls: 'good' });
    if (state.phoneCharging) {
      badges.push({
        text: `🔋 চার্জিং (PB ${Math.round(state.powerBankBattery)}%)`,
        cls: 'good'
      });
    }
    if (state.hasTeaCup) {
      badges.push({ text: `🍵 গরম চা (${state.teaSipsLeft} চুমুক)`, cls: 'good' });
    }
    if (state.biscuits > 0) badges.push({ text: `🍪 বিস্কুট ×${state.biscuits}`, cls: '' });

    const html = badges
      .map((b) => `<span class="status-badge ${b.cls}">${b.text}</span>`)
      .join('');
    if (this.statusBadges.innerHTML !== html) {
      this.statusBadges.innerHTML = html;
    }
  }

  public updateInteractionPrompt(
    nearest: Interactable | null,
    isSitting: boolean,
    isSleeping = false
  ): void {
    if (isSleeping) {
      this.interactPrompt.classList.remove('hidden');
      this.interactPromptText.textContent = '☀️ ঘুম থেকে উঠুন • Wake Up (E / Space)';
      return;
    }
    if (isSitting) {
      this.interactPrompt.classList.remove('hidden');
      this.interactPromptText.textContent = '🧍 উঠে দাঁড়ান • Stand Up (E / Space)';
      return;
    }
    if (nearest) {
      this.interactPrompt.classList.remove('hidden');
      this.interactPromptText.textContent = `${nearest.icon} ${nearest.labelBn} • ${nearest.labelEn}`;
    } else {
      this.interactPrompt.classList.add('hidden');
    }
  }

  public updateActionButtons(actions: ActionButtonSpec[]): void {
    const key = actions
      .map((a) => `${a.id}:${a.label}:${a.active ? 1 : 0}:${a.primary ? 1 : 0}`)
      .join('|');
    if (key === this.lastActionKey) return;
    this.lastActionKey = key;

    this.actionButtonsBar.innerHTML = '';
    for (const spec of actions) {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      if (spec.active) btn.classList.add('active-state');
      if (spec.primary) btn.classList.add('primary');
      btn.textContent = `${spec.icon} ${spec.label}`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        spec.onClick();
      });
      this.actionButtonsBar.appendChild(btn);
    }
  }
}
