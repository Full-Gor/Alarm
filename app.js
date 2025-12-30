/**
 * Alarm Clock Application
 * Full-featured clock app with multiple clock types, alarm, stopwatch, timer, and rounds
 */

// ============================================
// Audio Manager - Handles all sound playback
// ============================================
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.customAudioElement = document.getElementById('audio-custom');
        this.defaultAudioElement = document.getElementById('audio-default');
        this.currentlyPlaying = null;
        this.oscillator = null;
        this.gainNode = null;
        this.muted = false;
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    generateBeepSound(type = 'default') {
        if (this.muted) return;
        this.initAudioContext();
        this.stopAll();

        const frequencies = {
            default: [800, 1000, 800, 1000],
            gentle: [400, 500, 400, 500],
            energetic: [1000, 1200, 1400, 1200]
        };

        const freqs = frequencies[type] || frequencies.default;
        let noteIndex = 0;

        const playNote = () => {
            if (!this.currentlyPlaying) return;

            this.oscillator = this.audioContext.createOscillator();
            this.gainNode = this.audioContext.createGain();

            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);

            this.oscillator.frequency.value = freqs[noteIndex % freqs.length];
            this.oscillator.type = type === 'gentle' ? 'sine' : 'square';

            this.gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            this.gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);

            this.oscillator.start();
            this.oscillator.stop(this.audioContext.currentTime + 0.3);

            noteIndex++;
        };

        this.currentlyPlaying = setInterval(playNote, 500);
        playNote();
    }

    playCustomAudio(audioData) {
        if (this.muted) return;
        this.stopAll();
        this.customAudioElement.src = audioData;
        this.customAudioElement.loop = true;
        this.customAudioElement.play().catch(err => {
            console.error('Error playing custom audio:', err);
            this.generateBeepSound('default');
        });
        this.currentlyPlaying = 'custom';
    }

    play(soundType, customAudioData = null) {
        if (this.muted) return;
        if (soundType === 'custom' && customAudioData) {
            this.playCustomAudio(customAudioData);
        } else {
            this.generateBeepSound(soundType);
        }
    }

    playBeep(count = 1, frequency = 800) {
        if (this.muted) return;
        this.initAudioContext();

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                osc.frequency.value = frequency;
                osc.type = 'sine';
                gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
                osc.start();
                osc.stop(this.audioContext.currentTime + 0.15);
            }, i * 200);
        }
    }

    stopAll() {
        if (this.currentlyPlaying === 'custom') {
            this.customAudioElement.pause();
            this.customAudioElement.currentTime = 0;
        }
        if (typeof this.currentlyPlaying === 'number') {
            clearInterval(this.currentlyPlaying);
        }
        if (this.oscillator) {
            try { this.oscillator.stop(); } catch (e) {}
        }
        this.currentlyPlaying = null;
    }

    testSound(soundType, customAudioData = null, duration = 2000) {
        this.play(soundType, customAudioData);
        setTimeout(() => this.stopAll(), duration);
    }

    setMuted(muted) {
        this.muted = muted;
        if (muted) this.stopAll();
    }
}

// ============================================
// Storage Manager
// ============================================
class StorageManager {
    static save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Storage save error:', e);
        }
    }

    static load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error('Storage load error:', e);
            return defaultValue;
        }
    }
}

// ============================================
// Notification Manager
// ============================================
class NotificationManager {
    constructor() {
        this.permission = Notification.permission;
    }

    async requestPermission() {
        if (!('Notification' in window)) return false;
        if (this.permission === 'granted') return true;
        if (this.permission !== 'denied') {
            const result = await Notification.requestPermission();
            this.permission = result;
            return result === 'granted';
        }
        return false;
    }

    show(title, options = {}) {
        if (this.permission === 'granted') {
            const notification = new Notification(title, {
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%238b5cf6"><path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>',
                vibrate: [200, 100, 200],
                requireInteraction: true,
                ...options
            });
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            return notification;
        }
        return null;
    }
}

// ============================================
// Clock Module with Multiple Types
// ============================================
class ClockModule {
    constructor() {
        this.currentType = StorageManager.load('clockType', 'digital');
        this.holoViewMode = 'face';
        this.interval = null;
        this.msInterval = null;
        this.holoTicksGenerated = false;

        this.initElements();
        this.initEventListeners();
        this.switchClockType(this.currentType);
        this.start();
    }

    initElements() {
        // Digital
        this.digitalClock = document.getElementById('digital-clock');
        this.dateDisplay = document.getElementById('date-display');
        this.hourHand = document.getElementById('hour-hand');
        this.minuteHand = document.getElementById('minute-hand');
        this.secondHand = document.getElementById('second-hand');

        // Holographic
        this.holoTime = document.getElementById('holo-time');
        this.holoDate = document.getElementById('holo-date');
        this.holoClockWrapper = document.getElementById('holo-clock-wrapper');
        this.holoHourRing = document.getElementById('holo-hour-ring');
        this.holoMinRing = document.getElementById('holo-min-ring');
        this.holoSecRing = document.getElementById('holo-sec-ring');
        this.holoMsRing = document.getElementById('holo-ms-ring');
        this.holoNeedleHour = document.getElementById('holo-needle-hour');
        this.holoNeedleMin = document.getElementById('holo-needle-min');
        this.holoNeedleSec = document.getElementById('holo-needle-sec');
        this.holoNeedleMs = document.getElementById('holo-needle-ms');
        this.holoBallHour = document.getElementById('holo-ball-hour');
        this.holoBallMin = document.getElementById('holo-ball-min');
        this.holoBallSec = document.getElementById('holo-ball-sec');
        this.holoBallMs = document.getElementById('holo-ball-ms');
        this.holoTicksHour = document.getElementById('holo-ticks-hour');
        this.holoTicksMin = document.getElementById('holo-ticks-min');
        this.holoTicksSec = document.getElementById('holo-ticks-sec');
        this.holoModeBtns = document.querySelectorAll('.holo-mode-btn');

        // Fluid
        this.fluidDate = document.getElementById('fluid-date');

        // Flap dates
        this.flapDarkDate = document.getElementById('flap-dark-date');
        this.flapLightDate = document.getElementById('flap-light-date');

        // Golden
        this.goldenTime = document.getElementById('golden-time');
        this.goldenDate = document.getElementById('golden-date');
        this.goldenHour = document.getElementById('golden-hour');
        this.goldenMinute = document.getElementById('golden-minute');
        this.goldenSecond = document.getElementById('golden-second');

        // Clock selector
        this.selectorBtn = document.getElementById('clock-selector-btn');
        this.selectorModal = document.getElementById('clock-selector-modal');
        this.closeBtn = document.getElementById('close-clock-selector');
        this.clockOptions = document.querySelectorAll('.clock-option');
        this.clockTypes = document.querySelectorAll('.clock-type');
    }

    initEventListeners() {
        this.selectorBtn.addEventListener('click', () => this.openSelector());
        this.closeBtn.addEventListener('click', () => this.closeSelector());
        this.selectorModal.addEventListener('click', (e) => {
            if (e.target === this.selectorModal) this.closeSelector();
        });

        this.clockOptions.forEach(option => {
            option.addEventListener('click', () => {
                const type = option.dataset.clock;
                this.switchClockType(type);
                this.closeSelector();
            });
        });

        // Holographic view mode buttons
        this.holoModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setHoloViewMode(btn.dataset.mode);
            });
        });
    }

    setHoloViewMode(mode) {
        this.holoViewMode = mode;
        this.holoModeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        if (this.holoClockWrapper) {
            this.holoClockWrapper.className = `holo-clock-wrapper mode-${mode}`;
        }
    }

    openSelector() {
        this.selectorModal.classList.add('active');
    }

    closeSelector() {
        this.selectorModal.classList.remove('active');
    }

    switchClockType(type) {
        this.currentType = type;
        StorageManager.save('clockType', type);

        // Update UI
        this.clockTypes.forEach(el => el.classList.remove('active'));
        this.clockOptions.forEach(opt => opt.classList.remove('active'));

        const typeEl = document.getElementById(`clock-${type}`);
        if (typeEl) typeEl.classList.add('active');

        const optionEl = document.querySelector(`[data-clock="${type}"]`);
        if (optionEl) optionEl.classList.add('active');

        // Clear ms interval if not holographic
        if (this.msInterval && type !== 'holographic') {
            clearInterval(this.msInterval);
            this.msInterval = null;
        }

        // Start ms interval for holographic and generate ticks
        if (type === 'holographic') {
            if (!this.holoTicksGenerated) {
                this.generateHoloTicks();
                this.holoTicksGenerated = true;
            }
            if (!this.msInterval) {
                this.msInterval = setInterval(() => this.updateHolographicMs(), 50);
            }
        }
    }

    generateHoloTicks() {
        const cx = 160, cy = 160;

        // Hour ticks (12)
        if (this.holoTicksHour) {
            let hourTicks = '';
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * 360 - 90;
                const rad = angle * Math.PI / 180;
                const r1 = 130, r2 = 140;
                const x1 = cx + Math.cos(rad) * r1;
                const y1 = cy + Math.sin(rad) * r1;
                const x2 = cx + Math.cos(rad) * r2;
                const y2 = cy + Math.sin(rad) * r2;
                hourTicks += `<line class="holo-tick holo-tick-hour" data-index="${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
            }
            this.holoTicksHour.innerHTML = hourTicks;
        }

        // Minute ticks (60)
        if (this.holoTicksMin) {
            let minTicks = '';
            for (let i = 0; i < 60; i++) {
                const angle = (i / 60) * 360 - 90;
                const rad = angle * Math.PI / 180;
                const r1 = 98, r2 = 106;
                const x1 = cx + Math.cos(rad) * r1;
                const y1 = cy + Math.sin(rad) * r1;
                const x2 = cx + Math.cos(rad) * r2;
                const y2 = cy + Math.sin(rad) * r2;
                minTicks += `<line class="holo-tick holo-tick-min" data-index="${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
            }
            this.holoTicksMin.innerHTML = minTicks;
        }

        // Second ticks (60)
        if (this.holoTicksSec) {
            let secTicks = '';
            for (let i = 0; i < 60; i++) {
                const angle = (i / 60) * 360 - 90;
                const rad = angle * Math.PI / 180;
                const r1 = 68, r2 = 76;
                const x1 = cx + Math.cos(rad) * r1;
                const y1 = cy + Math.sin(rad) * r1;
                const x2 = cx + Math.cos(rad) * r2;
                const y2 = cy + Math.sin(rad) * r2;
                secTicks += `<line class="holo-tick holo-tick-sec" data-index="${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
            }
            this.holoTicksSec.innerHTML = secTicks;
        }
    }

    start() {
        this.update();
        this.interval = setInterval(() => this.update(), 1000);
    }

    update() {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        const s = now.getSeconds();
        const h12 = h % 12;

        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const dateStr = now.toLocaleDateString('fr-FR', options);

        // Digital
        if (this.digitalClock) this.digitalClock.textContent = timeStr;
        if (this.dateDisplay) this.dateDisplay.textContent = dateStr;

        // Analog hands
        const hourDeg = (h12 * 30) + (m * 0.5);
        const minuteDeg = (m * 6) + (s * 0.1);
        const secondDeg = s * 6;

        if (this.hourHand) this.hourHand.style.transform = `rotate(${hourDeg}deg)`;
        if (this.minuteHand) this.minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
        if (this.secondHand) this.secondHand.style.transform = `rotate(${secondDeg}deg)`;

        // Holographic
        if (this.holoTime) this.holoTime.textContent = timeStr;
        if (this.holoDate) this.holoDate.textContent = dateStr.toUpperCase();
        this.updateHolographicRings(h, m, s);
        this.updateHolographicNeedles(h, m, s);
        this.updateHolographicTicks(h, m, s);

        // Fluid
        this.updateFluid(h, m, s);
        if (this.fluidDate) this.fluidDate.textContent = dateStr;

        // Flap
        this.updateFlap('flap-dark', h, m, s);
        this.updateFlap('flap-light', h, m, s);
        if (this.flapDarkDate) this.flapDarkDate.textContent = dateStr;
        if (this.flapLightDate) this.flapLightDate.textContent = dateStr;

        // Golden
        if (this.goldenTime) this.goldenTime.textContent = timeStr;
        if (this.goldenDate) this.goldenDate.textContent = dateStr;
        this.updateGoldenHands(h12, m, s);
    }

    updateHolographicRings(h, m, s) {
        const hourCircum = 2 * Math.PI * 120;
        const minCircum = 2 * Math.PI * 90;
        const secCircum = 2 * Math.PI * 62;

        const hourProgress = ((h % 12) + m / 60) / 12;
        const minProgress = (m + s / 60) / 60;
        const secProgress = s / 60;

        if (this.holoHourRing) {
            this.holoHourRing.style.strokeDashoffset = hourCircum * (1 - hourProgress);
        }
        if (this.holoMinRing) {
            this.holoMinRing.style.strokeDashoffset = minCircum * (1 - minProgress);
        }
        if (this.holoSecRing) {
            this.holoSecRing.style.strokeDashoffset = secCircum * (1 - secProgress);
        }

        // Update balls positions
        this.updateHoloBall(this.holoBallHour, hourProgress, 120);
        this.updateHoloBall(this.holoBallMin, minProgress, 90);
        this.updateHoloBall(this.holoBallSec, secProgress, 62);
    }

    updateHoloBall(ball, progress, radius) {
        if (!ball) return;
        const angle = progress * 360 - 90;
        const rad = angle * Math.PI / 180;
        const cx = 160, cy = 160;
        const x = cx + Math.cos(rad) * radius;
        const y = cy + Math.sin(rad) * radius;
        ball.setAttribute('cx', x);
        ball.setAttribute('cy', y);
    }

    updateHolographicNeedles(h, m, s) {
        const hourAngle = ((h % 12) + m / 60) / 12 * 360;
        const minAngle = (m + s / 60) / 60 * 360;
        const secAngle = s / 60 * 360;

        if (this.holoNeedleHour) this.holoNeedleHour.style.transform = `rotate(${hourAngle}deg)`;
        if (this.holoNeedleMin) this.holoNeedleMin.style.transform = `rotate(${minAngle}deg)`;
        if (this.holoNeedleSec) this.holoNeedleSec.style.transform = `rotate(${secAngle}deg)`;
    }

    updateHolographicTicks(h, m, s) {
        const hourIndex = Math.floor(((h % 12) + m / 60) / 12 * 12);
        const minIndex = Math.floor((m + s / 60) / 60 * 60);
        const secIndex = s;

        // Update hour ticks
        if (this.holoTicksHour) {
            this.holoTicksHour.querySelectorAll('.holo-tick-hour').forEach((tick, i) => {
                tick.classList.toggle('active', i <= hourIndex);
            });
        }

        // Update minute ticks
        if (this.holoTicksMin) {
            this.holoTicksMin.querySelectorAll('.holo-tick-min').forEach((tick, i) => {
                tick.classList.toggle('active', i <= minIndex);
            });
        }

        // Update second ticks
        if (this.holoTicksSec) {
            this.holoTicksSec.querySelectorAll('.holo-tick-sec').forEach((tick, i) => {
                tick.classList.toggle('active', i <= secIndex);
            });
        }
    }

    updateHolographicMs() {
        const now = Date.now();
        const ms = now % 1000;
        const msCircum = 2 * Math.PI * 38;
        const msProgress = ms / 1000;

        if (this.holoMsRing) {
            this.holoMsRing.style.strokeDashoffset = msCircum * (1 - msProgress);
        }

        // Update ms ball
        this.updateHoloBall(this.holoBallMs, msProgress, 38);

        // Update ms needle
        const msAngle = msProgress * 360;
        if (this.holoNeedleMs) {
            this.holoNeedleMs.style.transform = `rotate(${msAngle}deg)`;
        }
    }

    updateFluid(h, m, s) {
        const digits = [
            ['fluid-h0', Math.floor(h / 10)],
            ['fluid-h1', h % 10],
            ['fluid-m0', Math.floor(m / 10)],
            ['fluid-m1', m % 10],
            ['fluid-s0', Math.floor(s / 10)],
            ['fluid-s1', s % 10]
        ];

        digits.forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    }

    updateFlap(prefix, h, m, s) {
        const digits = [
            [`${prefix}-h0`, Math.floor(h / 10)],
            [`${prefix}-h1`, h % 10],
            [`${prefix}-m0`, Math.floor(m / 10)],
            [`${prefix}-m1`, m % 10],
            [`${prefix}-s0`, Math.floor(s / 10)],
            [`${prefix}-s1`, s % 10]
        ];

        digits.forEach(([digit, value]) => {
            const el = document.querySelector(`[data-digit="${digit}"]`);
            if (el) {
                const topSpan = el.querySelector('.flap-top span');
                const bottomSpan = el.querySelector('.flap-bottom span');
                if (topSpan) topSpan.textContent = value;
                if (bottomSpan) bottomSpan.textContent = value;
            }
        });
    }

    updateGoldenHands(h12, m, s) {
        const hourAngle = (h12 + m / 60) * 30;
        const minAngle = (m + s / 60) * 6;
        const secAngle = s * 6;

        if (this.goldenHour) {
            this.goldenHour.setAttribute('transform', `rotate(${hourAngle}, 150, 150)`);
        }
        if (this.goldenMinute) {
            this.goldenMinute.setAttribute('transform', `rotate(${minAngle}, 150, 150)`);
        }
        if (this.goldenSecond) {
            this.goldenSecond.setAttribute('transform', `rotate(${secAngle}, 150, 150)`);
        }
    }
}

// ============================================
// Alarm Module
// ============================================
class AlarmModule {
    constructor(audioManager, notificationManager) {
        this.audioManager = audioManager;
        this.notificationManager = notificationManager;
        this.alarms = StorageManager.load('alarms', []);
        this.editingAlarmId = null;
        this.ringingAlarm = null;

        this.initElements();
        this.initEventListeners();
        this.renderAlarms();
        this.startChecking();
    }

    initElements() {
        this.alarmList = document.getElementById('alarm-list');
        this.addAlarmBtn = document.getElementById('add-alarm-btn');
        this.modal = document.getElementById('alarm-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.hoursInput = document.getElementById('alarm-hours');
        this.minutesInput = document.getElementById('alarm-minutes');
        this.labelInput = document.getElementById('alarm-label');
        this.soundSelect = document.getElementById('alarm-sound');
        this.customSoundGroup = document.getElementById('custom-sound-group');
        this.customSoundInput = document.getElementById('custom-sound-input');
        this.customSoundName = document.getElementById('custom-sound-name');
        this.testSoundBtn = document.getElementById('test-sound-btn');
        this.cancelBtn = document.getElementById('cancel-alarm');
        this.saveBtn = document.getElementById('save-alarm');
        this.dayBtns = document.querySelectorAll('.day-btn');

        // Ringing modal
        this.ringingModal = document.getElementById('alarm-ringing-modal');
        this.ringingTime = document.getElementById('ringing-time');
        this.ringingLabel = document.getElementById('ringing-label');
        this.snoozeBtn = document.getElementById('snooze-btn');
        this.dismissBtn = document.getElementById('dismiss-btn');
        this.stopSoundBtn = document.getElementById('stop-sound-btn');
        this.ringingCloseBtn = document.getElementById('ringing-close-btn');
    }

    initEventListeners() {
        this.addAlarmBtn.addEventListener('click', () => this.openModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.saveBtn.addEventListener('click', () => this.saveAlarm());

        this.soundSelect.addEventListener('change', () => {
            this.customSoundGroup.style.display = this.soundSelect.value === 'custom' ? 'block' : 'none';
        });

        this.customSoundInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.customSoundName.textContent = file.name;
        });

        this.testSoundBtn.addEventListener('click', () => this.testAlarmSound());

        this.dayBtns.forEach(btn => {
            btn.addEventListener('click', () => btn.classList.toggle('active'));
        });

        [this.hoursInput, this.minutesInput].forEach(input => {
            input.addEventListener('input', (e) => this.validateTimeInput(e.target));
            input.addEventListener('keydown', (e) => this.handleTimeKeydown(e));
            input.addEventListener('focus', (e) => e.target.select());
        });

        // Ringing modal buttons
        const handleSnooze = (e) => { e.preventDefault(); this.snoozeAlarm(); };
        const handleDismiss = (e) => { e.preventDefault(); this.dismissAlarm(); };
        const handleStopSound = (e) => { e.preventDefault(); this.audioManager.stopAll(); };

        this.snoozeBtn.addEventListener('click', handleSnooze);
        this.dismissBtn.addEventListener('click', handleDismiss);
        this.stopSoundBtn.addEventListener('click', handleStopSound);
        this.ringingCloseBtn.addEventListener('click', handleDismiss);

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (this.ringingModal.classList.contains('active')) {
                if (e.key === 'Escape' || e.key === ' ') {
                    e.preventDefault();
                    this.dismissAlarm();
                } else if (e.key === 's' || e.key === 'S') {
                    e.preventDefault();
                    this.snoozeAlarm();
                }
            }
        });
    }

    validateTimeInput(input) {
        let value = parseInt(input.value) || 0;
        const max = parseInt(input.max);
        const min = parseInt(input.min);
        if (value > max) value = max;
        if (value < min) value = min;
        input.value = value;
    }

    handleTimeKeydown(e) {
        const input = e.target;
        const value = parseInt(input.value) || 0;
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            input.value = value >= parseInt(input.max) ? parseInt(input.min) : value + 1;
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            input.value = value <= parseInt(input.min) ? parseInt(input.max) : value - 1;
        }
    }

    openModal(alarm = null) {
        this.editingAlarmId = alarm ? alarm.id : null;
        this.modalTitle.textContent = alarm ? 'Modifier l\'alarme' : 'Nouvelle Alarme';

        if (alarm) {
            this.hoursInput.value = alarm.hours;
            this.minutesInput.value = alarm.minutes;
            this.labelInput.value = alarm.label || '';
            this.soundSelect.value = alarm.sound || 'default';
            this.customSoundGroup.style.display = alarm.sound === 'custom' ? 'block' : 'none';
            if (alarm.customSoundName) this.customSoundName.textContent = alarm.customSoundName;
            this.dayBtns.forEach(btn => {
                const day = parseInt(btn.dataset.day);
                btn.classList.toggle('active', alarm.days && alarm.days.includes(day));
            });
        } else {
            const now = new Date();
            this.hoursInput.value = now.getHours();
            this.minutesInput.value = 0;
            this.labelInput.value = '';
            this.soundSelect.value = 'default';
            this.customSoundGroup.style.display = 'none';
            this.customSoundName.textContent = '';
            this.dayBtns.forEach(btn => btn.classList.remove('active'));
        }

        this.modal.classList.add('active');
        this.hoursInput.focus();
    }

    closeModal() {
        this.modal.classList.remove('active');
        this.editingAlarmId = null;
        this.audioManager.stopAll();
    }

    async testAlarmSound() {
        const soundType = this.soundSelect.value;
        if (soundType === 'custom') {
            const file = this.customSoundInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => this.audioManager.testSound('custom', e.target.result, 3000);
                reader.readAsDataURL(file);
            } else {
                alert('Veuillez sélectionner un fichier audio');
            }
        } else {
            this.audioManager.testSound(soundType, null, 2000);
        }
    }

    async saveAlarm() {
        const hours = parseInt(this.hoursInput.value);
        const minutes = parseInt(this.minutesInput.value);
        const label = this.labelInput.value.trim();
        const sound = this.soundSelect.value;
        const days = Array.from(this.dayBtns).filter(btn => btn.classList.contains('active')).map(btn => parseInt(btn.dataset.day));

        let customSoundData = null, customSoundName = '';

        if (sound === 'custom') {
            const file = this.customSoundInput.files[0];
            if (file) {
                customSoundData = await this.readFileAsDataURL(file);
                customSoundName = file.name;
            } else if (this.editingAlarmId) {
                const existing = this.alarms.find(a => a.id === this.editingAlarmId);
                if (existing) {
                    customSoundData = existing.customSoundData;
                    customSoundName = existing.customSoundName;
                }
            }
        }

        const alarm = {
            id: this.editingAlarmId || Date.now().toString(),
            hours, minutes, label, sound, days, customSoundData, customSoundName,
            enabled: true, lastTriggered: null
        };

        if (this.editingAlarmId) {
            const index = this.alarms.findIndex(a => a.id === this.editingAlarmId);
            if (index !== -1) this.alarms[index] = alarm;
        } else {
            this.alarms.push(alarm);
        }

        this.saveAlarms();
        this.renderAlarms();
        this.closeModal();
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    saveAlarms() { StorageManager.save('alarms', this.alarms); }
    deleteAlarm(id) {
        this.alarms = this.alarms.filter(a => a.id !== id);
        this.saveAlarms();
        this.renderAlarms();
    }

    toggleAlarm(id) {
        const alarm = this.alarms.find(a => a.id === id);
        if (alarm) {
            alarm.enabled = !alarm.enabled;
            alarm.lastTriggered = null;
            this.saveAlarms();
            this.renderAlarms();
        }
    }

    renderAlarms() {
        if (this.alarms.length === 0) {
            this.alarmList.innerHTML = '<p class="empty-message">Aucune alarme configurée</p>';
            return;
        }

        const fullDayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

        this.alarmList.innerHTML = this.alarms.map(alarm => {
            const timeStr = `${String(alarm.hours).padStart(2, '0')}:${String(alarm.minutes).padStart(2, '0')}`;
            let daysStr = 'Une seule fois';

            if (alarm.days && alarm.days.length > 0) {
                if (alarm.days.length === 7) daysStr = 'Tous les jours';
                else if (JSON.stringify(alarm.days.sort()) === JSON.stringify([1,2,3,4,5])) daysStr = 'En semaine';
                else if (JSON.stringify(alarm.days.sort()) === JSON.stringify([0,6])) daysStr = 'Week-end';
                else daysStr = alarm.days.map(d => fullDayNames[d]).join(', ');
            }

            return `
                <div class="alarm-item ${alarm.enabled ? '' : 'disabled'}" data-id="${alarm.id}">
                    <div class="alarm-info" onclick="app.alarm.openModal(app.alarm.alarms.find(a => a.id === '${alarm.id}'))">
                        <div class="alarm-time">${timeStr}</div>
                        ${alarm.label ? `<div class="alarm-label">${alarm.label}</div>` : ''}
                        <div class="alarm-days">${daysStr}</div>
                    </div>
                    <div class="alarm-actions">
                        <label class="toggle-switch">
                            <input type="checkbox" ${alarm.enabled ? 'checked' : ''} onchange="app.alarm.toggleAlarm('${alarm.id}')">
                            <span class="toggle-slider"></span>
                        </label>
                        <button class="delete-alarm-btn" onclick="app.alarm.deleteAlarm('${alarm.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    startChecking() {
        setInterval(() => this.checkAlarms(), 1000);
    }

    checkAlarms() {
        if (this.ringingAlarm) return;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDay();
        const currentTimeKey = `${currentHour}:${currentMinute}`;

        for (const alarm of this.alarms) {
            if (!alarm.enabled) continue;
            if (alarm.hours === currentHour && alarm.minutes === currentMinute) {
                if (alarm.lastTriggeredTime === currentTimeKey) continue;
                if (alarm.days && alarm.days.length > 0 && !alarm.days.includes(currentDay)) continue;

                this.triggerAlarm(alarm);
                alarm.lastTriggeredTime = currentTimeKey;

                if (!alarm.days || alarm.days.length === 0) alarm.enabled = false;

                this.saveAlarms();
                this.renderAlarms();
                break;
            }
        }
    }

    triggerAlarm(alarm) {
        this.ringingAlarm = alarm;
        this.audioManager.play(alarm.sound, alarm.customSoundData);

        this.notificationManager.show(`Alarme: ${alarm.label || 'Réveil'}`, {
            body: `Il est ${String(alarm.hours).padStart(2, '0')}:${String(alarm.minutes).padStart(2, '0')}`,
            tag: 'alarm-' + alarm.id
        });

        const timeStr = `${String(alarm.hours).padStart(2, '0')}:${String(alarm.minutes).padStart(2, '0')}`;
        this.ringingTime.textContent = timeStr;
        this.ringingLabel.textContent = alarm.label || 'Alarme';

        this.showModal(this.ringingModal);
    }

    snoozeAlarm() {
        this.audioManager.stopAll();
        this.hideModal(this.ringingModal);

        if (!this.ringingAlarm) return;

        const alarmToSnooze = this.ringingAlarm;
        this.ringingAlarm = null;

        const now = new Date();
        now.setMinutes(now.getMinutes() + 3);

        const snoozeAlarm = {
            ...alarmToSnooze,
            id: 'snooze-' + Date.now(),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            label: (alarmToSnooze.label || 'Alarme') + ' (Répétition)',
            days: [],
            enabled: true,
            lastTriggered: null
        };

        this.alarms.push(snoozeAlarm);
        this.saveAlarms();
        this.renderAlarms();
    }

    dismissAlarm() {
        this.audioManager.stopAll();
        this.hideModal(this.ringingModal);
        this.ringingAlarm = null;
    }

    showModal(modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.classList.add('active');
    }

    hideModal(modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        modal.classList.remove('active');
    }
}

// ============================================
// Stopwatch Module
// ============================================
class StopwatchModule {
    constructor() {
        this.display = document.getElementById('stopwatch-display');
        this.statusDisplay = document.getElementById('stopwatch-status');
        this.recordingIndicator = document.getElementById('recording-indicator');
        this.startBtn = document.getElementById('stopwatch-start');
        this.resetBtn = document.getElementById('stopwatch-reset');
        this.lapBtn = document.getElementById('stopwatch-lap');
        this.lapsContainer = document.getElementById('laps-container');
        this.lapsList = document.getElementById('laps-list');

        this.running = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.interval = null;
        this.laps = [];

        this.initEventListeners();
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleStart());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.lapBtn.addEventListener('click', () => this.addLap());

        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('stopwatch-tab').classList.contains('active')) return;
            if (e.target.tagName === 'INPUT') return;

            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                this.toggleStart();
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                this.reset();
            } else if (e.key === 'l' || e.key === 'L') {
                e.preventDefault();
                if (this.running) this.addLap();
            }
        });
    }

    toggleStart() {
        if (this.running) this.stop();
        else this.start();
    }

    start() {
        this.running = true;
        this.startTime = Date.now() - this.elapsedTime;
        this.updateUI();
        this.interval = setInterval(() => this.update(), 10);
    }

    stop() {
        this.running = false;
        this.elapsedTime = Date.now() - this.startTime;
        clearInterval(this.interval);
        this.updateUI();
    }

    reset() {
        this.running = false;
        this.elapsedTime = 0;
        this.laps = [];
        clearInterval(this.interval);
        this.display.innerHTML = '<span class="stopwatch-main">00:00</span><span class="stopwatch-ms">.00</span>';
        this.lapsContainer.style.display = 'none';
        this.lapsList.innerHTML = '';
        this.updateUI();
    }

    updateUI() {
        const playIcon = this.startBtn.querySelector('.play-icon');
        const pauseIcon = this.startBtn.querySelector('.pause-icon');

        if (this.running) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            this.startBtn.classList.add('running');
            this.statusDisplay.textContent = 'En cours';
            this.recordingIndicator.classList.add('active');
            this.resetBtn.disabled = true;
            this.lapBtn.disabled = false;
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            this.startBtn.classList.remove('running');
            this.statusDisplay.textContent = this.elapsedTime > 0 ? 'En pause' : 'Prêt';
            this.recordingIndicator.classList.remove('active');
            this.resetBtn.disabled = this.elapsedTime === 0;
            this.lapBtn.disabled = true;
        }
    }

    update() {
        this.elapsedTime = Date.now() - this.startTime;
        this.display.innerHTML = this.formatTime(this.elapsedTime);
    }

    formatTime(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);

        return `<span class="stopwatch-main">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</span><span class="stopwatch-ms">.${String(centiseconds).padStart(2, '0')}</span>`;
    }

    formatTimeSimple(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);

        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
    }

    addLap() {
        if (!this.running) return;

        const lapTime = this.elapsedTime;
        const previousLapTime = this.laps.length > 0 ? this.laps[this.laps.length - 1].totalTime : 0;
        const splitTime = lapTime - previousLapTime;

        this.laps.push({ number: this.laps.length + 1, splitTime, totalTime: lapTime });
        this.renderLaps();
    }

    renderLaps() {
        if (this.laps.length === 0) {
            this.lapsContainer.style.display = 'none';
            return;
        }

        this.lapsContainer.style.display = 'block';

        const splitTimes = this.laps.map(l => l.splitTime);
        const bestTime = Math.min(...splitTimes);
        const worstTime = Math.max(...splitTimes);

        this.lapsList.innerHTML = [...this.laps].reverse().map(lap => {
            let className = 'lap-item';
            if (this.laps.length > 2) {
                if (lap.splitTime === bestTime) className += ' best';
                else if (lap.splitTime === worstTime) className += ' worst';
            }

            return `
                <div class="${className}">
                    <span class="lap-number">${lap.number}</span>
                    <span class="lap-split">${this.formatTimeSimple(lap.splitTime)}</span>
                    <span class="lap-total">${this.formatTimeSimple(lap.totalTime)}</span>
                </div>
            `;
        }).join('');
    }
}

// ============================================
// Timer Module
// ============================================
class TimerModule {
    constructor(audioManager, notificationManager) {
        this.audioManager = audioManager;
        this.notificationManager = notificationManager;

        this.initElements();
        this.initEventListeners();

        this.running = false;
        this.paused = false;
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.interval = null;
        this.customSoundData = null;
        this.initialDuration = '';
    }

    initElements() {
        this.setupContainer = document.getElementById('timer-setup');
        this.runningContainer = document.getElementById('timer-running');
        this.hoursInput = document.getElementById('timer-hours');
        this.minutesInput = document.getElementById('timer-minutes');
        this.secondsInput = document.getElementById('timer-seconds');
        this.startBtn = document.getElementById('timer-start-btn');
        this.display = document.getElementById('timer-display');
        this.subtext = document.getElementById('timer-subtext');
        this.progressCircle = document.getElementById('timer-progress-circle');
        this.cancelBtn = document.getElementById('timer-cancel');
        this.pauseBtn = document.getElementById('timer-pause');
        this.presetBtns = document.querySelectorAll('.preset-btn');
        this.soundSelect = document.getElementById('timer-sound');
        this.customSoundGroup = document.getElementById('timer-custom-sound-group');
        this.customSoundInput = document.getElementById('timer-custom-sound-input');
        this.customSoundName = document.getElementById('timer-custom-sound-name');

        this.finishedModal = document.getElementById('timer-finished-modal');
        this.finishedDuration = document.getElementById('timer-finished-duration');
        this.dismissBtn = document.getElementById('timer-dismiss-btn');
        this.stopSoundBtn = document.getElementById('timer-stop-sound-btn');
        this.closeBtn = document.getElementById('timer-close-btn');
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.cancelBtn.addEventListener('click', () => this.cancel());
        this.pauseBtn.addEventListener('click', () => this.togglePause());

        const handleDismiss = (e) => { e.preventDefault(); this.dismiss(); };
        const handleStopSound = (e) => { e.preventDefault(); this.audioManager.stopAll(); };

        this.dismissBtn.addEventListener('click', handleDismiss);
        this.stopSoundBtn.addEventListener('click', handleStopSound);
        this.closeBtn.addEventListener('click', handleDismiss);

        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const seconds = parseInt(btn.dataset.seconds);
                this.hoursInput.value = Math.floor(seconds / 3600);
                this.minutesInput.value = Math.floor((seconds % 3600) / 60);
                this.secondsInput.value = seconds % 60;
            });
        });

        this.soundSelect.addEventListener('change', () => {
            this.customSoundGroup.style.display = this.soundSelect.value === 'custom' ? 'block' : 'none';
        });

        this.customSoundInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                this.customSoundName.textContent = file.name;
                const reader = new FileReader();
                reader.onload = (ev) => { this.customSoundData = ev.target.result; };
                reader.readAsDataURL(file);
            }
        });

        [this.hoursInput, this.minutesInput, this.secondsInput].forEach(input => {
            input.addEventListener('input', () => this.validateInput(input));
            input.addEventListener('focus', (e) => e.target.select());
        });
    }

    validateInput(input) {
        let value = parseInt(input.value) || 0;
        const max = parseInt(input.max);
        const min = parseInt(input.min);
        if (value > max) value = max;
        if (value < min) value = min;
        input.value = value;
    }

    start() {
        const hours = parseInt(this.hoursInput.value) || 0;
        const minutes = parseInt(this.minutesInput.value) || 0;
        const seconds = parseInt(this.secondsInput.value) || 0;

        this.totalSeconds = hours * 3600 + minutes * 60 + seconds;

        if (this.totalSeconds <= 0) {
            alert('Veuillez définir une durée valide');
            return;
        }

        this.remainingSeconds = this.totalSeconds;
        this.running = true;
        this.paused = false;
        this.initialDuration = this.formatDuration(this.totalSeconds);

        this.setupContainer.style.display = 'none';
        this.runningContainer.style.display = 'block';
        this.updatePauseBtn();
        this.updateDisplay();

        this.interval = setInterval(() => this.tick(), 1000);
    }

    tick() {
        if (this.paused) return;

        this.remainingSeconds--;
        this.updateDisplay();

        if (this.remainingSeconds <= 0) {
            this.finish();
        }
    }

    updateDisplay() {
        const hours = Math.floor(this.remainingSeconds / 3600);
        const minutes = Math.floor((this.remainingSeconds % 3600) / 60);
        const seconds = this.remainingSeconds % 60;

        if (hours > 0) {
            this.display.textContent = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            this.display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        this.subtext.textContent = this.paused ? 'En pause' : 'En cours...';

        const progress = this.remainingSeconds / this.totalSeconds;
        const circumference = 2 * Math.PI * 45;
        this.progressCircle.style.strokeDashoffset = circumference * (1 - progress);
    }

    togglePause() {
        this.paused = !this.paused;
        this.updatePauseBtn();
        this.updateDisplay();
    }

    updatePauseBtn() {
        const playIcon = this.pauseBtn.querySelector('.play-icon');
        const pauseIcon = this.pauseBtn.querySelector('.pause-icon');

        if (this.paused) {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            this.pauseBtn.classList.remove('pause-active');
            this.pauseBtn.classList.add('play-btn');
        } else {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            this.pauseBtn.classList.add('pause-active');
            this.pauseBtn.classList.remove('play-btn');
        }
    }

    cancel() {
        clearInterval(this.interval);
        this.running = false;
        this.paused = false;
        this.setupContainer.style.display = 'block';
        this.runningContainer.style.display = 'none';
    }

    finish() {
        clearInterval(this.interval);
        this.running = false;

        const soundType = this.soundSelect.value;
        if (soundType === 'custom' && this.customSoundData) {
            this.audioManager.play('custom', this.customSoundData);
        } else {
            this.audioManager.play(soundType);
        }

        this.notificationManager.show('Minuteur terminé !', {
            body: `Le minuteur de ${this.initialDuration} est écoulé`,
            tag: 'timer-finished'
        });

        this.finishedDuration.textContent = this.initialDuration;
        this.showModal(this.finishedModal);
    }

    formatDuration(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}min`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

        return parts.join(' ');
    }

    dismiss() {
        this.audioManager.stopAll();
        this.hideModal(this.finishedModal);
        this.setupContainer.style.display = 'block';
        this.runningContainer.style.display = 'none';
        this.progressCircle.style.strokeDashoffset = 0;
    }

    showModal(modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.classList.add('active');
    }

    hideModal(modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        modal.classList.remove('active');
    }
}

// ============================================
// Rounds Module
// ============================================
class RoundsModule {
    constructor(audioManager, notificationManager) {
        this.audioManager = audioManager;
        this.notificationManager = notificationManager;

        this.config = StorageManager.load('roundsConfig', {
            rounds: 3,
            roundTime: 180,
            restTime: 60,
            prepareTime: 10
        });

        this.tempConfig = { ...this.config };
        this.state = 'idle'; // idle, prepare, round, rest, finished
        this.currentRound = 1;
        this.remainingSeconds = 0;
        this.totalPhaseSeconds = 0;
        this.running = false;
        this.paused = false;
        this.interval = null;

        this.initElements();
        this.initEventListeners();
        this.updateConfigDisplay();
        this.updateDisplay();
    }

    initElements() {
        this.currentRoundEl = document.getElementById('current-round');
        this.totalRoundsEl = document.getElementById('total-rounds');
        this.phaseEl = document.getElementById('rounds-phase');
        this.timeEl = document.getElementById('rounds-time');
        this.subtextEl = document.getElementById('rounds-subtext');
        this.progressCircle = document.getElementById('rounds-progress-circle');

        this.startBtn = document.getElementById('rounds-start');
        this.resetBtn = document.getElementById('rounds-reset');
        this.skipBtn = document.getElementById('rounds-skip');
        this.settingsBtn = document.getElementById('rounds-settings-btn');

        this.configRounds = document.getElementById('config-rounds');
        this.configRoundTime = document.getElementById('config-round-time');
        this.configRestTime = document.getElementById('config-rest-time');
        this.configPrepare = document.getElementById('config-prepare');

        this.settingsModal = document.getElementById('rounds-modal');
        this.closeModalBtn = document.getElementById('close-rounds-modal');
        this.applyBtn = document.getElementById('rounds-apply-btn');
        this.presetBtns = document.querySelectorAll('.rounds-preset-btn');
        this.configBtns = document.querySelectorAll('.config-btn');

        this.modalRounds = document.getElementById('modal-rounds');
        this.modalRoundTime = document.getElementById('modal-round-time');
        this.modalRestTime = document.getElementById('modal-rest-time');
        this.modalPrepare = document.getElementById('modal-prepare');

        this.finishedModal = document.getElementById('rounds-finished-modal');
        this.finishedText = document.getElementById('rounds-finished-text');
        this.dismissBtn = document.getElementById('rounds-dismiss-btn');
        this.stopSoundBtn = document.getElementById('rounds-stop-sound-btn');
        this.closeFinishedBtn = document.getElementById('rounds-close-btn');
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.toggleStart());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.skipBtn.addEventListener('click', () => this.skip());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.closeModalBtn.addEventListener('click', () => this.closeSettings());
        this.applyBtn.addEventListener('click', () => this.applySettings());

        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) this.closeSettings();
        });

        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => this.applyPreset(btn.dataset.preset));
        });

        this.configBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handleConfigBtn(btn.dataset.action));
        });

        const handleDismiss = (e) => { e.preventDefault(); this.dismissFinished(); };
        const handleStopSound = (e) => { e.preventDefault(); this.audioManager.stopAll(); };

        this.dismissBtn.addEventListener('click', handleDismiss);
        this.stopSoundBtn.addEventListener('click', handleStopSound);
        this.closeFinishedBtn.addEventListener('click', handleDismiss);
    }

    toggleStart() {
        if (this.running) {
            this.pause();
        } else {
            if (this.state === 'idle' || this.state === 'finished') {
                this.startWorkout();
            } else {
                this.resume();
            }
        }
    }

    startWorkout() {
        this.currentRound = 1;
        this.state = 'prepare';
        this.remainingSeconds = this.config.prepareTime;
        this.totalPhaseSeconds = this.config.prepareTime;
        this.running = true;
        this.paused = false;

        this.updateUI();
        this.interval = setInterval(() => this.tick(), 1000);
    }

    pause() {
        this.paused = true;
        this.running = false;
        this.updateUI();
    }

    resume() {
        this.paused = false;
        this.running = true;
        this.updateUI();
    }

    reset() {
        clearInterval(this.interval);
        this.state = 'idle';
        this.currentRound = 1;
        this.remainingSeconds = this.config.prepareTime;
        this.totalPhaseSeconds = this.config.prepareTime;
        this.running = false;
        this.paused = false;
        this.updateUI();
        this.updateDisplay();
    }

    skip() {
        if (!this.running && !this.paused) return;
        this.nextPhase();
    }

    tick() {
        if (this.paused) return;

        this.remainingSeconds--;

        if (this.remainingSeconds <= 3 && this.remainingSeconds > 0) {
            this.audioManager.playBeep(1, 800);
        }

        if (this.remainingSeconds <= 0) {
            this.audioManager.playBeep(3, 1000);
            this.nextPhase();
        }

        this.updateDisplay();
    }

    nextPhase() {
        switch (this.state) {
            case 'prepare':
                this.state = 'round';
                this.remainingSeconds = this.config.roundTime;
                this.totalPhaseSeconds = this.config.roundTime;
                break;
            case 'round':
                if (this.currentRound >= this.config.rounds) {
                    this.finishWorkout();
                    return;
                }
                this.state = 'rest';
                this.remainingSeconds = this.config.restTime;
                this.totalPhaseSeconds = this.config.restTime;
                break;
            case 'rest':
                this.currentRound++;
                this.state = 'round';
                this.remainingSeconds = this.config.roundTime;
                this.totalPhaseSeconds = this.config.roundTime;
                break;
        }
        this.updateDisplay();
    }

    finishWorkout() {
        clearInterval(this.interval);
        this.state = 'finished';
        this.running = false;

        this.audioManager.play('energetic');
        this.notificationManager.show('Entraînement terminé !', {
            body: `Vous avez complété ${this.config.rounds} rounds !`,
            tag: 'rounds-finished'
        });

        this.finishedText.textContent = `Vous avez complété ${this.config.rounds} rounds !`;
        this.showModal(this.finishedModal);

        this.updateUI();
        this.updateDisplay();
    }

    dismissFinished() {
        this.audioManager.stopAll();
        this.hideModal(this.finishedModal);
        this.reset();
    }

    updateUI() {
        const playIcon = this.startBtn.querySelector('.play-icon');
        const pauseIcon = this.startBtn.querySelector('.pause-icon');

        if (this.running) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            this.startBtn.classList.add('running');
            this.skipBtn.disabled = false;
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            this.startBtn.classList.remove('running');
            this.skipBtn.disabled = this.state === 'idle' || this.state === 'finished';
        }
    }

    updateDisplay() {
        this.currentRoundEl.textContent = this.currentRound;
        this.totalRoundsEl.textContent = this.config.rounds;

        const minutes = Math.floor(this.remainingSeconds / 60);
        const seconds = this.remainingSeconds % 60;
        this.timeEl.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;

        const phaseNames = {
            idle: 'PRÉPARATION',
            prepare: 'PRÉPARATION',
            round: 'ROUND',
            rest: 'REPOS',
            finished: 'TERMINÉ'
        };

        const subtexts = {
            idle: 'Préparez-vous...',
            prepare: 'Préparez-vous...',
            round: 'Donnez tout !',
            rest: 'Récupérez...',
            finished: 'Félicitations !'
        };

        this.phaseEl.textContent = phaseNames[this.state];
        this.phaseEl.className = `rounds-phase ${this.state}`;
        this.subtextEl.textContent = this.paused ? 'En pause' : subtexts[this.state];

        // Progress circle
        this.progressCircle.className = `rounds-fg-circle ${this.state}`;
        const progress = this.totalPhaseSeconds > 0 ? this.remainingSeconds / this.totalPhaseSeconds : 1;
        const circumference = 2 * Math.PI * 45;
        this.progressCircle.style.strokeDashoffset = circumference * (1 - progress);
    }

    updateConfigDisplay() {
        this.configRounds.textContent = this.config.rounds;
        this.configRoundTime.textContent = this.formatTimeShort(this.config.roundTime);
        this.configRestTime.textContent = this.formatTimeShort(this.config.restTime);
        this.configPrepare.textContent = `${this.config.prepareTime}s`;
    }

    formatTimeShort(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return s === 0 ? `${m}:00` : `${m}:${String(s).padStart(2, '0')}`;
    }

    openSettings() {
        this.tempConfig = { ...this.config };
        this.updateModalValues();
        this.settingsModal.classList.add('active');
    }

    closeSettings() {
        this.settingsModal.classList.remove('active');
    }

    updateModalValues() {
        this.modalRounds.textContent = this.tempConfig.rounds;
        this.modalRoundTime.textContent = this.formatTimeShort(this.tempConfig.roundTime);
        this.modalRestTime.textContent = this.formatTimeShort(this.tempConfig.restTime);
        this.modalPrepare.textContent = `${this.tempConfig.prepareTime}s`;
    }

    applyPreset(preset) {
        const presets = {
            boxe: { rounds: 3, roundTime: 180, restTime: 60, prepareTime: 10 },
            hiit: { rounds: 8, roundTime: 30, restTime: 10, prepareTime: 10 },
            tabata: { rounds: 8, roundTime: 20, restTime: 10, prepareTime: 10 },
            combat: { rounds: 5, roundTime: 300, restTime: 60, prepareTime: 10 }
        };

        if (presets[preset]) {
            this.tempConfig = { ...presets[preset] };
            this.updateModalValues();
        }
    }

    handleConfigBtn(action) {
        switch (action) {
            case 'rounds-minus':
                if (this.tempConfig.rounds > 1) this.tempConfig.rounds--;
                break;
            case 'rounds-plus':
                if (this.tempConfig.rounds < 99) this.tempConfig.rounds++;
                break;
            case 'round-minus':
                if (this.tempConfig.roundTime > 10) this.tempConfig.roundTime -= 10;
                break;
            case 'round-plus':
                if (this.tempConfig.roundTime < 3600) this.tempConfig.roundTime += 10;
                break;
            case 'rest-minus':
                if (this.tempConfig.restTime > 5) this.tempConfig.restTime -= 5;
                break;
            case 'rest-plus':
                if (this.tempConfig.restTime < 600) this.tempConfig.restTime += 5;
                break;
            case 'prepare-minus':
                if (this.tempConfig.prepareTime > 1) this.tempConfig.prepareTime--;
                break;
            case 'prepare-plus':
                if (this.tempConfig.prepareTime < 60) this.tempConfig.prepareTime++;
                break;
        }
        this.updateModalValues();
    }

    applySettings() {
        this.config = { ...this.tempConfig };
        StorageManager.save('roundsConfig', this.config);
        this.updateConfigDisplay();
        this.reset();
        this.closeSettings();
    }

    showModal(modal) {
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.classList.add('active');
    }

    hideModal(modal) {
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        modal.classList.remove('active');
    }
}

// ============================================
// Voice Recognition Module (No AI - Keywords based)
// ============================================
class VoiceRecognitionModule {
    constructor(alarmModule) {
        this.alarmModule = alarmModule;
        this.recognition = null;
        this.isListening = false;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.fabStartX = 0;
        this.fabStartY = 0;

        // Categories with keywords
        this.categories = {
            sante: {
                name: 'Santé',
                keywords: ['dentiste', 'médecin', 'docteur', 'hôpital', 'clinique', 'pharmacie', 'kiné', 'ostéo', 'psy', 'ophtalmo', 'dermato', 'cardio', 'vaccin', 'radio', 'scanner', 'irm', 'analyse', 'sang', 'ordonnance', 'rendez-vous médical']
            },
            travail: {
                name: 'Travail',
                keywords: ['réunion', 'meeting', 'bureau', 'travail', 'boulot', 'projet', 'deadline', 'client', 'patron', 'boss', 'collègue', 'présentation', 'conférence', 'call', 'appel', 'zoom', 'teams', 'entretien', 'interview', 'formation']
            },
            sport: {
                name: 'Sport',
                keywords: ['sport', 'gym', 'musculation', 'fitness', 'course', 'running', 'jogging', 'vélo', 'natation', 'piscine', 'tennis', 'foot', 'football', 'basket', 'yoga', 'boxe', 'entraînement', 'match', 'coach', 'salle']
            },
            personnel: {
                name: 'Personnel',
                keywords: ['réveil', 'rappel', 'alarme', 'perso', 'personnel', 'moi', 'important', 'noter', 'penser', 'oublier', 'médicament', 'pilule', 'sieste', 'dormir', 'coucher', 'lever']
            },
            courses: {
                name: 'Courses',
                keywords: ['courses', 'supermarché', 'magasin', 'shopping', 'acheter', 'commander', 'livraison', 'colis', 'marché', 'boulangerie', 'épicerie', 'carrefour', 'leclerc', 'auchan', 'lidl']
            },
            transport: {
                name: 'Transport',
                keywords: ['train', 'avion', 'bus', 'métro', 'tram', 'taxi', 'uber', 'voiture', 'gare', 'aéroport', 'vol', 'départ', 'arrivée', 'voyage', 'trajet', 'covoiturage', 'blablacar', 'essence', 'garage', 'contrôle technique']
            },
            education: {
                name: 'Éducation',
                keywords: ['cours', 'école', 'université', 'fac', 'examen', 'partiel', 'révision', 'devoir', 'td', 'tp', 'prof', 'professeur', 'étudier', 'bibliothèque', 'exposé', 'mémoire', 'thèse', 'soutenance']
            },
            loisirs: {
                name: 'Loisirs',
                keywords: ['cinéma', 'film', 'concert', 'spectacle', 'théâtre', 'expo', 'musée', 'resto', 'restaurant', 'bar', 'soirée', 'fête', 'anniversaire', 'sortie', 'bowling', 'karaoké', 'jeu', 'gaming']
            },
            famille: {
                name: 'Famille',
                keywords: ['famille', 'enfant', 'bébé', 'fils', 'fille', 'parent', 'mère', 'père', 'maman', 'papa', 'grand-père', 'grand-mère', 'frère', 'sœur', 'cousin', 'nièce', 'neveu', 'crèche', 'nounou', 'école']
            },
            finance: {
                name: 'Finance',
                keywords: ['banque', 'virement', 'facture', 'loyer', 'impôt', 'taxe', 'assurance', 'mutuelle', 'crédit', 'prêt', 'épargne', 'comptable', 'notaire', 'avocat', 'paiement', 'salaire']
            }
        };

        // Day keywords
        this.dayKeywords = {
            'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 'vendredi': 5, 'samedi': 6, 'dimanche': 0,
            'demain': 'tomorrow', 'après-demain': 'afterTomorrow', 'aujourd\'hui': 'today', "aujourd'hui": 'today'
        };

        this.initElements();
        this.initSpeechRecognition();
        this.initEventListeners();
        this.initDraggable();

        // Restore position from storage
        this.restorePosition();
    }

    initElements() {
        this.voiceFab = document.getElementById('voice-fab');
        this.voiceFabBtn = document.getElementById('voice-fab-btn');
        this.voiceModal = document.getElementById('voice-modal');
        this.voiceCloseBtn = document.getElementById('voice-close-btn');
        this.voiceStatus = document.getElementById('voice-status');
        this.voiceTranscript = document.getElementById('voice-transcript');
        this.voiceListeningContainer = document.querySelector('.voice-listening-container');
        this.voiceResultContainer = document.getElementById('voice-result-container');
        this.voiceResultTitle = document.getElementById('voice-result-title');
        this.voiceResultDetails = document.getElementById('voice-result-details');
        this.voiceResultCategory = document.getElementById('voice-result-category');
        this.voiceErrorContainer = document.getElementById('voice-error-container');
        this.voiceErrorText = document.getElementById('voice-error-text');
        this.voiceRetryBtn = document.getElementById('voice-retry-btn');
        this.voiceCancelBtn = document.getElementById('voice-cancel-btn');
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Web Speech API not supported');
            if (this.voiceFab) {
                this.voiceFab.style.display = 'none';
            }
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'fr-FR';
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.voiceFab.classList.add('listening');
            this.showListening();
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            this.voiceTranscript.textContent = finalTranscript || interimTranscript;

            if (finalTranscript) {
                this.processTranscript(finalTranscript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.voiceFab.classList.remove('listening');

            let errorMessage = 'Erreur de reconnaissance';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'Aucune parole détectée';
                    break;
                case 'audio-capture':
                    errorMessage = 'Microphone non disponible';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone non autorisé';
                    break;
                case 'network':
                    errorMessage = 'Erreur réseau';
                    break;
            }
            this.showError(errorMessage);
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.voiceFab.classList.remove('listening');
        };
    }

    initEventListeners() {
        if (this.voiceFabBtn) {
            this.voiceFabBtn.addEventListener('click', (e) => {
                if (!this.isDragging) {
                    this.startListening();
                }
            });
        }

        if (this.voiceCloseBtn) {
            this.voiceCloseBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.voiceRetryBtn) {
            this.voiceRetryBtn.addEventListener('click', () => this.startListening());
        }

        if (this.voiceCancelBtn) {
            this.voiceCancelBtn.addEventListener('click', () => this.closeModal());
        }

        if (this.voiceModal) {
            this.voiceModal.addEventListener('click', (e) => {
                if (e.target === this.voiceModal) {
                    this.closeModal();
                }
            });
        }
    }

    initDraggable() {
        if (!this.voiceFab) return;

        let dragThreshold = 5;
        let moved = false;

        const onStart = (e) => {
            const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;

            this.dragStartX = clientX;
            this.dragStartY = clientY;

            const rect = this.voiceFab.getBoundingClientRect();
            this.fabStartX = rect.left;
            this.fabStartY = rect.top;

            moved = false;
            this.isDragging = false;

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
        };

        const onMove = (e) => {
            const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;

            const deltaX = Math.abs(clientX - this.dragStartX);
            const deltaY = Math.abs(clientY - this.dragStartY);

            if (deltaX > dragThreshold || deltaY > dragThreshold) {
                moved = true;
                this.isDragging = true;
                this.voiceFab.classList.add('dragging');

                if (e.type === 'touchmove') {
                    e.preventDefault();
                }

                const newX = this.fabStartX + (clientX - this.dragStartX);
                const newY = this.fabStartY + (clientY - this.dragStartY);

                // Keep within viewport
                const maxX = window.innerWidth - this.voiceFab.offsetWidth;
                const maxY = window.innerHeight - this.voiceFab.offsetHeight;

                const boundedX = Math.max(0, Math.min(newX, maxX));
                const boundedY = Math.max(0, Math.min(newY, maxY));

                this.voiceFab.style.left = boundedX + 'px';
                this.voiceFab.style.top = boundedY + 'px';
                this.voiceFab.style.right = 'auto';
                this.voiceFab.style.bottom = 'auto';
            }
        };

        const onEnd = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);

            this.voiceFab.classList.remove('dragging');

            if (moved) {
                // Save position
                this.savePosition();
                // Prevent click from firing
                setTimeout(() => {
                    this.isDragging = false;
                }, 100);
            }
        };

        this.voiceFab.addEventListener('mousedown', onStart);
        this.voiceFab.addEventListener('touchstart', onStart, { passive: true });
    }

    savePosition() {
        const rect = this.voiceFab.getBoundingClientRect();
        StorageManager.save('voiceFabPosition', {
            left: rect.left,
            top: rect.top
        });
    }

    restorePosition() {
        const position = StorageManager.load('voiceFabPosition');
        if (position && this.voiceFab) {
            // Validate position is still within viewport
            const maxX = window.innerWidth - 56;
            const maxY = window.innerHeight - 56;

            const boundedX = Math.max(0, Math.min(position.left, maxX));
            const boundedY = Math.max(0, Math.min(position.top, maxY));

            this.voiceFab.style.left = boundedX + 'px';
            this.voiceFab.style.top = boundedY + 'px';
            this.voiceFab.style.right = 'auto';
            this.voiceFab.style.bottom = 'auto';
        }
    }

    startListening() {
        if (!this.recognition) {
            alert('La reconnaissance vocale n\'est pas supportée par votre navigateur. Utilisez Chrome ou Edge.');
            return;
        }

        this.showModal();
        this.showListening();
        this.voiceTranscript.textContent = '';

        try {
            this.recognition.start();
        } catch (e) {
            console.error('Error starting recognition:', e);
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    showModal() {
        this.voiceModal.classList.add('active');
    }

    closeModal() {
        this.voiceModal.classList.remove('active');
        this.stopListening();
    }

    showListening() {
        this.voiceListeningContainer.style.display = 'block';
        this.voiceResultContainer.style.display = 'none';
        this.voiceErrorContainer.style.display = 'none';
        this.voiceStatus.textContent = 'Parlez maintenant...';
    }

    showResult(alarm, category) {
        this.voiceListeningContainer.style.display = 'none';
        this.voiceResultContainer.style.display = 'block';
        this.voiceErrorContainer.style.display = 'none';

        const timeStr = `${String(alarm.hours).padStart(2, '0')}:${String(alarm.minutes).padStart(2, '0')}`;
        this.voiceResultTitle.textContent = 'Alarme créée !';
        this.voiceResultDetails.textContent = `${alarm.label} à ${timeStr}`;
        this.voiceResultCategory.textContent = category.name;
        this.voiceResultCategory.className = `voice-result-category ${category.key}`;

        // Auto close after 3 seconds
        setTimeout(() => {
            this.closeModal();
        }, 3000);
    }

    showError(message) {
        this.voiceListeningContainer.style.display = 'none';
        this.voiceResultContainer.style.display = 'none';
        this.voiceErrorContainer.style.display = 'block';
        this.voiceErrorText.textContent = message;
    }

    processTranscript(text) {
        const lowerText = text.toLowerCase().trim();
        console.log('Processing transcript:', lowerText);

        // Parse time
        const time = this.parseTime(lowerText);
        if (!time) {
            this.showError('Heure non reconnue. Dites par exemple "15h" ou "8 heures 30"');
            return;
        }

        // Parse date/day
        const date = this.parseDate(lowerText);

        // Detect category
        const category = this.detectCategory(lowerText);

        // Create label from text (remove time patterns)
        let label = this.extractLabel(lowerText);
        if (!label) {
            label = category.name;
        }

        // Create the alarm
        const alarm = {
            id: Date.now().toString(),
            hours: time.hours,
            minutes: time.minutes,
            label: label.charAt(0).toUpperCase() + label.slice(1),
            sound: 'default',
            days: date.days,
            customSoundData: null,
            customSoundName: '',
            enabled: true,
            lastTriggered: null
        };

        // Add to alarm module
        this.alarmModule.alarms.push(alarm);
        this.alarmModule.saveAlarms();
        this.alarmModule.renderAlarms();

        this.showResult(alarm, category);
    }

    parseTime(text) {
        // Patterns for time recognition
        const patterns = [
            /(\d{1,2})\s*h(?:eures?)?\s*(\d{1,2})?/i,  // 15h, 15h30, 15 heures 30
            /(\d{1,2})\s*:\s*(\d{2})/,                  // 15:30
            /(\d{1,2})\s+heures?\s*(\d{1,2})?/i,        // 15 heures, 15 heures 30
            /à\s+(\d{1,2})\s*h?(?:eures?)?\s*(\d{1,2})?/i  // à 15h, à 15h30
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                let hours = parseInt(match[1]);
                let minutes = match[2] ? parseInt(match[2]) : 0;

                // Handle edge cases
                if (hours < 0 || hours > 23) continue;
                if (minutes < 0 || minutes > 59) continue;

                return { hours, minutes };
            }
        }

        // Special times
        if (text.includes('midi')) {
            return { hours: 12, minutes: 0 };
        }
        if (text.includes('minuit')) {
            return { hours: 0, minutes: 0 };
        }

        return null;
    }

    parseDate(text) {
        const today = new Date();
        let days = [];

        // Check for specific days
        for (const [keyword, dayValue] of Object.entries(this.dayKeywords)) {
            if (text.includes(keyword)) {
                if (dayValue === 'tomorrow') {
                    // Don't set days for one-time alarms
                    return { days: [], targetDate: 'tomorrow' };
                } else if (dayValue === 'afterTomorrow') {
                    return { days: [], targetDate: 'afterTomorrow' };
                } else if (dayValue === 'today') {
                    return { days: [], targetDate: 'today' };
                } else {
                    days.push(dayValue);
                }
            }
        }

        // Check for "tous les jours" or "chaque jour"
        if (text.includes('tous les jours') || text.includes('chaque jour')) {
            days = [0, 1, 2, 3, 4, 5, 6];
        }

        // Check for "en semaine"
        if (text.includes('en semaine') || text.includes('semaine')) {
            days = [1, 2, 3, 4, 5];
        }

        // Check for "week-end" or "weekend"
        if (text.includes('week-end') || text.includes('weekend')) {
            days = [0, 6];
        }

        return { days };
    }

    detectCategory(text) {
        for (const [key, category] of Object.entries(this.categories)) {
            for (const keyword of category.keywords) {
                if (text.includes(keyword)) {
                    return { key, name: category.name };
                }
            }
        }
        return { key: 'default', name: 'Rappel' };
    }

    extractLabel(text) {
        // Remove time patterns
        let label = text
            .replace(/\d{1,2}\s*h(?:eures?)?\s*\d{0,2}/gi, '')
            .replace(/\d{1,2}\s*:\s*\d{2}/gi, '')
            .replace(/à\s+\d{1,2}/gi, '')
            .replace(/midi/gi, '')
            .replace(/minuit/gi, '');

        // Remove day keywords
        for (const keyword of Object.keys(this.dayKeywords)) {
            label = label.replace(new RegExp(keyword, 'gi'), '');
        }

        // Remove common words
        label = label
            .replace(/tous les jours/gi, '')
            .replace(/chaque jour/gi, '')
            .replace(/en semaine/gi, '')
            .replace(/week-end/gi, '')
            .replace(/weekend/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        return label;
    }
}

// ============================================
// Tab Navigation
// ============================================
class TabNavigation {
    constructor() {
        this.navBtns = document.querySelectorAll('.nav-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        this.initEventListeners();
    }

    initEventListeners() {
        this.navBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.key === '1') this.switchTab('clock');
            else if (e.key === '2') this.switchTab('alarm');
            else if (e.key === '3') this.switchTab('stopwatch');
            else if (e.key === '4') this.switchTab('timer');
            else if (e.key === '5') this.switchTab('rounds');
        });
    }

    switchTab(tabName) {
        this.navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
    }
}

// ============================================
// Settings Module with Neumorphic UI
// ============================================
class SettingsModule {
    constructor(alarmModule, audioManager) {
        this.alarmModule = alarmModule;
        this.audioManager = audioManager;
        this.isDarkMode = StorageManager.load('darkMode', true);
        this.settings = StorageManager.load('appSettings', {
            alarmVolume: 80,
            timerVolume: 70,
            vibration: false,
            notifications: true
        });

        this.initElements();
        this.initEventListeners();
        this.applyTheme();
        this.updateSliders();
        this.updateStats();

        // Update stats periodically
        setInterval(() => this.updateStats(), 5000);
    }

    initElements() {
        // Theme controls
        this.darkModeToggle = document.getElementById('dark-mode-toggle');
        this.themeMiniToggle = document.getElementById('theme-mini-toggle');
        this.darkModeBtn = document.querySelector('.dark-mode-btn');
        this.offBtn = document.querySelector('.off-btn');
        this.sunIcon = document.getElementById('sun-icon');
        this.moonIcon = document.getElementById('moon-icon');

        // Volume sliders
        this.alarmVolumeSlider = document.getElementById('alarm-volume');
        this.alarmVolumeFill = document.getElementById('alarm-volume-fill');
        this.alarmVolumeThumb = document.getElementById('alarm-volume-thumb');
        this.alarmVolumeValue = document.getElementById('alarm-volume-value');

        this.timerVolumeSlider = document.getElementById('timer-volume');
        this.timerVolumeFill = document.getElementById('timer-volume-fill');
        this.timerVolumeThumb = document.getElementById('timer-volume-thumb');
        this.timerVolumeValue = document.getElementById('timer-volume-value');

        // Switches
        this.vibrationSwitch = document.getElementById('vibration-switch');
        this.notificationSwitch = document.getElementById('notification-switch');

        // Stats
        this.alarmCountEl = document.getElementById('settings-alarm-count');
        this.alarmProgressEl = document.getElementById('alarm-progress');
        this.roundsCountEl = document.getElementById('settings-rounds-count');
        this.roundsProgressEl = document.getElementById('rounds-progress');

        // Navigation buttons
        this.backBtn = document.getElementById('settings-back-btn');
        this.gearBtn = document.getElementById('settings-gear-btn');

        // Nav items
        this.navItems = document.querySelectorAll('.neu-nav-item');
    }

    initEventListeners() {
        // Dark mode toggle
        if (this.darkModeToggle) {
            this.darkModeToggle.addEventListener('click', () => this.toggleDarkMode());
        }

        if (this.themeMiniToggle) {
            this.themeMiniToggle.addEventListener('click', () => this.toggleDarkMode());
        }

        if (this.darkModeBtn) {
            this.darkModeBtn.addEventListener('click', () => {
                if (!this.isDarkMode) this.toggleDarkMode();
            });
        }

        if (this.offBtn) {
            this.offBtn.addEventListener('click', () => {
                if (this.isDarkMode) this.toggleDarkMode();
            });
        }

        // Volume sliders
        if (this.alarmVolumeSlider) {
            this.alarmVolumeSlider.addEventListener('input', (e) => {
                this.updateSlider('alarm', e.target.value);
            });
        }

        if (this.timerVolumeSlider) {
            this.timerVolumeSlider.addEventListener('input', (e) => {
                this.updateSlider('timer', e.target.value);
            });
        }

        // Switches
        if (this.vibrationSwitch) {
            this.vibrationSwitch.addEventListener('click', () => {
                this.settings.vibration = !this.settings.vibration;
                this.vibrationSwitch.classList.toggle('active', this.settings.vibration);
                this.saveSettings();
            });
        }

        if (this.notificationSwitch) {
            this.notificationSwitch.addEventListener('click', () => {
                this.settings.notifications = !this.settings.notifications;
                this.notificationSwitch.classList.toggle('active', this.settings.notifications);
                this.saveSettings();
            });
        }

        // Back button - go to clock tab
        if (this.backBtn) {
            this.backBtn.addEventListener('click', () => {
                if (window.app && window.app.navigation) {
                    window.app.navigation.switchTab('clock');
                }
            });
        }

        // Gear button - animate
        if (this.gearBtn) {
            this.gearBtn.addEventListener('click', () => {
                this.gearBtn.style.transform = 'rotate(180deg)';
                setTimeout(() => {
                    this.gearBtn.style.transform = '';
                }, 300);
            });
        }

        // Nav items
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                this.navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });

        // Category pills animation
        document.querySelectorAll('.neu-category-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                pill.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    pill.style.transform = '';
                }, 150);
            });
        });
    }

    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        StorageManager.save('darkMode', this.isDarkMode);
        this.applyTheme();
    }

    applyTheme() {
        document.body.classList.toggle('light-mode', !this.isDarkMode);

        // Update toggle states
        if (this.darkModeToggle) {
            this.darkModeToggle.classList.toggle('active', !this.isDarkMode);
        }

        if (this.themeMiniToggle) {
            this.themeMiniToggle.classList.toggle('active', !this.isDarkMode);
        }

        // Update buttons
        if (this.darkModeBtn && this.offBtn) {
            this.darkModeBtn.classList.toggle('active', this.isDarkMode);
            this.offBtn.classList.toggle('active', !this.isDarkMode);
        }
    }

    updateSlider(type, value) {
        const percent = value + '%';

        if (type === 'alarm') {
            this.settings.alarmVolume = parseInt(value);
            if (this.alarmVolumeFill) this.alarmVolumeFill.style.width = percent;
            if (this.alarmVolumeThumb) this.alarmVolumeThumb.style.left = percent;
            if (this.alarmVolumeValue) this.alarmVolumeValue.textContent = percent;
        } else if (type === 'timer') {
            this.settings.timerVolume = parseInt(value);
            if (this.timerVolumeFill) this.timerVolumeFill.style.width = percent;
            if (this.timerVolumeThumb) this.timerVolumeThumb.style.left = percent;
            if (this.timerVolumeValue) this.timerVolumeValue.textContent = percent;
        }

        this.saveSettings();
    }

    updateSliders() {
        // Initialize slider positions
        this.updateSlider('alarm', this.settings.alarmVolume);
        this.updateSlider('timer', this.settings.timerVolume);

        // Set slider values
        if (this.alarmVolumeSlider) this.alarmVolumeSlider.value = this.settings.alarmVolume;
        if (this.timerVolumeSlider) this.timerVolumeSlider.value = this.settings.timerVolume;

        // Set switch states
        if (this.vibrationSwitch) {
            this.vibrationSwitch.classList.toggle('active', this.settings.vibration);
        }
        if (this.notificationSwitch) {
            this.notificationSwitch.classList.toggle('active', this.settings.notifications);
        }
    }

    updateStats() {
        // Get alarm count
        const alarms = this.alarmModule?.alarms || [];
        const activeAlarms = alarms.filter(a => a.enabled).length;
        const totalAlarms = alarms.length;

        if (this.alarmCountEl) {
            this.alarmCountEl.textContent = activeAlarms;
        }

        if (this.alarmProgressEl) {
            const progress = totalAlarms > 0 ? (activeAlarms / Math.max(totalAlarms, 10)) * 100 : 0;
            this.alarmProgressEl.style.width = Math.min(progress, 100) + '%';
        }

        // Get rounds count (mock data for now)
        const roundsCompleted = StorageManager.load('roundsCompleted', 0);
        if (this.roundsCountEl) {
            this.roundsCountEl.textContent = roundsCompleted;
        }

        if (this.roundsProgressEl) {
            const progress = Math.min((roundsCompleted / 20) * 100, 100);
            this.roundsProgressEl.style.width = progress + '%';
        }
    }

    saveSettings() {
        StorageManager.save('appSettings', this.settings);
    }
}

// ============================================
// Main App
// ============================================
class App {
    constructor() {
        this.audioManager = new AudioManager();
        this.notificationManager = new NotificationManager();

        this.clock = new ClockModule();
        this.alarm = new AlarmModule(this.audioManager, this.notificationManager);
        this.stopwatch = new StopwatchModule();
        this.timer = new TimerModule(this.audioManager, this.notificationManager);
        this.rounds = new RoundsModule(this.audioManager, this.notificationManager);
        this.navigation = new TabNavigation();
        this.voice = new VoiceRecognitionModule(this.alarm);
        this.settings = new SettingsModule(this.alarm, this.audioManager);

        document.addEventListener('click', () => {
            this.notificationManager.requestPermission();
        }, { once: true });

        console.log('Alarm Clock App initialized with all features including voice recognition and neumorphic settings');
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});
