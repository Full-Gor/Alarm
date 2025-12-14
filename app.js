/**
 * Alarm Clock Application
 * Full-featured clock app with alarm, stopwatch, and timer
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
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Generate beep sounds using Web Audio API
    generateBeepSound(type = 'default') {
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

    // Play custom uploaded audio
    playCustomAudio(audioData) {
        this.stopAll();
        this.customAudioElement.src = audioData;
        this.customAudioElement.loop = true;
        this.customAudioElement.play().catch(err => {
            console.error('Error playing custom audio:', err);
            this.generateBeepSound('default');
        });
        this.currentlyPlaying = 'custom';
    }

    // Play sound based on type
    play(soundType, customAudioData = null) {
        if (soundType === 'custom' && customAudioData) {
            this.playCustomAudio(customAudioData);
        } else {
            this.generateBeepSound(soundType);
        }
    }

    // Stop all audio
    stopAll() {
        if (this.currentlyPlaying === 'custom') {
            this.customAudioElement.pause();
            this.customAudioElement.currentTime = 0;
        }
        if (typeof this.currentlyPlaying === 'number') {
            clearInterval(this.currentlyPlaying);
        }
        if (this.oscillator) {
            try {
                this.oscillator.stop();
            } catch (e) {}
        }
        this.currentlyPlaying = null;
    }

    // Test sound preview
    testSound(soundType, customAudioData = null, duration = 2000) {
        this.play(soundType, customAudioData);
        setTimeout(() => this.stopAll(), duration);
    }
}

// ============================================
// Storage Manager - Handles localStorage
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

    static remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error('Storage remove error:', e);
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
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

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
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>',
                badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><circle cx="12" cy="12" r="10"/></svg>',
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
// Clock Module
// ============================================
class ClockModule {
    constructor() {
        this.digitalClock = document.getElementById('digital-clock');
        this.dateDisplay = document.getElementById('date-display');
        this.hourHand = document.getElementById('hour-hand');
        this.minuteHand = document.getElementById('minute-hand');
        this.secondHand = document.getElementById('second-hand');

        this.start();
    }

    start() {
        this.update();
        setInterval(() => this.update(), 1000);
    }

    update() {
        const now = new Date();

        // Digital clock
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        this.digitalClock.textContent = `${hours}:${minutes}:${seconds}`;

        // Date display
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        this.dateDisplay.textContent = now.toLocaleDateString('fr-FR', options);

        // Analog clock
        const h = now.getHours() % 12;
        const m = now.getMinutes();
        const s = now.getSeconds();

        const hourDeg = (h * 30) + (m * 0.5);
        const minuteDeg = (m * 6) + (s * 0.1);
        const secondDeg = s * 6;

        this.hourHand.style.transform = `rotate(${hourDeg}deg)`;
        this.minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
        this.secondHand.style.transform = `rotate(${secondDeg}deg)`;
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
        this.checkInterval = null;

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
        this.editingAlarmIdInput = document.getElementById('editing-alarm-id');

        // Ringing modal
        this.ringingModal = document.getElementById('alarm-ringing-modal');
        this.ringingTime = document.getElementById('ringing-time');
        this.ringingLabel = document.getElementById('ringing-label');
        this.snoozeBtn = document.getElementById('snooze-btn');
        this.dismissBtn = document.getElementById('dismiss-btn');
    }

    initEventListeners() {
        this.addAlarmBtn.addEventListener('click', () => this.openModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());
        this.saveBtn.addEventListener('click', () => this.saveAlarm());

        // Sound selection
        this.soundSelect.addEventListener('change', () => {
            this.customSoundGroup.style.display =
                this.soundSelect.value === 'custom' ? 'block' : 'none';
        });

        // Custom sound upload
        this.customSoundInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.customSoundName.textContent = file.name;
            }
        });

        // Test sound
        this.testSoundBtn.addEventListener('click', () => this.testAlarmSound());

        // Day buttons
        this.dayBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
            });
        });

        // Input validation and keyboard support
        [this.hoursInput, this.minutesInput].forEach(input => {
            input.addEventListener('input', (e) => this.validateTimeInput(e.target));
            input.addEventListener('keydown', (e) => this.handleTimeKeydown(e));
            input.addEventListener('focus', (e) => e.target.select());
        });

        // Ringing modal buttons - use pointerup for unified touch/mouse support
        const handleSnooze = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Snooze button pressed');
            this.snoozeAlarm();
        };

        const handleDismiss = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Dismiss button pressed');
            this.dismissAlarm();
        };

        // Use multiple event types for maximum compatibility
        this.snoozeBtn.addEventListener('pointerup', handleSnooze);
        this.snoozeBtn.addEventListener('click', handleSnooze);
        this.dismissBtn.addEventListener('pointerup', handleDismiss);
        this.dismissBtn.addEventListener('click', handleDismiss);

        // Close modal on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });

        // Keyboard shortcuts
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
            if (this.modal.classList.contains('active') && e.key === 'Escape') {
                this.closeModal();
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
        } else if (e.key === 'Tab' || e.key === 'Enter') {
            // Allow normal tab behavior
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
            if (alarm.customSoundName) {
                this.customSoundName.textContent = alarm.customSoundName;
            }

            // Set active days
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
        this.hoursInput.select();
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
                reader.onload = (e) => {
                    this.audioManager.testSound('custom', e.target.result, 3000);
                };
                reader.readAsDataURL(file);
            } else {
                alert('Veuillez d\'abord sélectionner un fichier audio');
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
        const days = Array.from(this.dayBtns)
            .filter(btn => btn.classList.contains('active'))
            .map(btn => parseInt(btn.dataset.day));

        let customSoundData = null;
        let customSoundName = '';

        if (sound === 'custom') {
            const file = this.customSoundInput.files[0];
            if (file) {
                customSoundData = await this.readFileAsDataURL(file);
                customSoundName = file.name;
            } else if (this.editingAlarmId) {
                // Keep existing custom sound if editing
                const existingAlarm = this.alarms.find(a => a.id === this.editingAlarmId);
                if (existingAlarm) {
                    customSoundData = existingAlarm.customSoundData;
                    customSoundName = existingAlarm.customSoundName;
                }
            }
        }

        const alarm = {
            id: this.editingAlarmId || Date.now().toString(),
            hours,
            minutes,
            label,
            sound,
            days,
            customSoundData,
            customSoundName,
            enabled: true,
            lastTriggered: null
        };

        if (this.editingAlarmId) {
            const index = this.alarms.findIndex(a => a.id === this.editingAlarmId);
            if (index !== -1) {
                this.alarms[index] = alarm;
            }
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

    saveAlarms() {
        StorageManager.save('alarms', this.alarms);
    }

    deleteAlarm(id) {
        this.alarms = this.alarms.filter(a => a.id !== id);
        this.saveAlarms();
        this.renderAlarms();
    }

    toggleAlarm(id) {
        const alarm = this.alarms.find(a => a.id === id);
        if (alarm) {
            alarm.enabled = !alarm.enabled;
            alarm.lastTriggered = null; // Reset so it can trigger again
            this.saveAlarms();
            this.renderAlarms();
        }
    }

    renderAlarms() {
        if (this.alarms.length === 0) {
            this.alarmList.innerHTML = '<p class="empty-message">Aucune alarme configurée</p>';
            return;
        }

        const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
        const fullDayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

        this.alarmList.innerHTML = this.alarms.map(alarm => {
            const timeStr = `${String(alarm.hours).padStart(2, '0')}:${String(alarm.minutes).padStart(2, '0')}`;
            let daysStr = '';

            if (alarm.days && alarm.days.length > 0) {
                if (alarm.days.length === 7) {
                    daysStr = 'Tous les jours';
                } else if (JSON.stringify(alarm.days.sort()) === JSON.stringify([1, 2, 3, 4, 5])) {
                    daysStr = 'En semaine';
                } else if (JSON.stringify(alarm.days.sort()) === JSON.stringify([0, 6])) {
                    daysStr = 'Week-end';
                } else {
                    daysStr = alarm.days.map(d => fullDayNames[d]).join(', ');
                }
            } else {
                daysStr = 'Une seule fois';
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
                            <input type="checkbox" ${alarm.enabled ? 'checked' : ''}
                                   onchange="app.alarm.toggleAlarm('${alarm.id}')">
                            <span class="toggle-slider"></span>
                        </label>
                        <button class="delete-alarm-btn" onclick="app.alarm.deleteAlarm('${alarm.id}')" title="Supprimer">
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
        // Check alarms every second
        this.checkInterval = setInterval(() => this.checkAlarms(), 1000);
    }

    checkAlarms() {
        if (this.ringingAlarm) return; // Already ringing

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDay = now.getDay();
        const currentTimeKey = `${currentHour}:${currentMinute}`;

        for (const alarm of this.alarms) {
            if (!alarm.enabled) continue;

            // Check if time matches
            if (alarm.hours === currentHour && alarm.minutes === currentMinute) {

                // Check if already triggered at this time
                if (alarm.lastTriggeredTime === currentTimeKey) continue;

                // Check days
                if (alarm.days && alarm.days.length > 0) {
                    if (!alarm.days.includes(currentDay)) continue;
                }

                // Trigger the alarm!
                this.triggerAlarm(alarm);
                alarm.lastTriggeredTime = currentTimeKey;

                // If it's a one-time alarm, disable it
                if (!alarm.days || alarm.days.length === 0) {
                    alarm.enabled = false;
                }

                this.saveAlarms();
                this.renderAlarms();
                break;
            }
        }
    }

    triggerAlarm(alarm) {
        this.ringingAlarm = alarm;

        // Play sound
        this.audioManager.play(alarm.sound, alarm.customSoundData);

        // Show notification
        this.notificationManager.show(`Alarme: ${alarm.label || 'Réveil'}`, {
            body: `Il est ${String(alarm.hours).padStart(2, '0')}:${String(alarm.minutes).padStart(2, '0')}`,
            tag: 'alarm-' + alarm.id
        });

        // Show ringing modal
        this.ringingTime.textContent = `${String(alarm.hours).padStart(2, '0')}:${String(alarm.minutes).padStart(2, '0')}`;
        this.ringingLabel.textContent = alarm.label || 'Alarme';
        this.ringingModal.classList.add('active');
    }

    snoozeAlarm() {
        console.log('snoozeAlarm called, ringingAlarm:', this.ringingAlarm);
        if (!this.ringingAlarm) {
            console.log('No ringing alarm, closing modal anyway');
            this.audioManager.stopAll();
            this.ringingModal.classList.remove('active');
            return;
        }

        const alarmToSnooze = this.ringingAlarm;
        this.ringingAlarm = null;

        this.audioManager.stopAll();
        this.ringingModal.classList.remove('active');
        console.log('Modal closed, creating snooze alarm');

        // Create a snooze alarm for 3 minutes from now
        const now = new Date();
        now.setMinutes(now.getMinutes() + 3);

        const snoozeAlarm = {
            ...alarmToSnooze,
            id: 'snooze-' + Date.now(),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            label: (alarmToSnooze.label || 'Alarme') + ' (Répétition)',
            days: [], // One-time
            enabled: true,
            lastTriggered: null
        };

        this.alarms.push(snoozeAlarm);
        this.saveAlarms();
        this.renderAlarms();
    }

    dismissAlarm() {
        console.log('dismissAlarm called');
        this.ringingAlarm = null;
        this.audioManager.stopAll();
        this.ringingModal.classList.remove('active');
        console.log('Alarm dismissed, modal closed');
    }
}

// ============================================
// Stopwatch Module
// ============================================
class StopwatchModule {
    constructor() {
        this.display = document.getElementById('stopwatch-display');
        this.startBtn = document.getElementById('stopwatch-start');
        this.resetBtn = document.getElementById('stopwatch-reset');
        this.lapBtn = document.getElementById('stopwatch-lap');
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

        // Keyboard shortcuts when stopwatch tab is active
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
        if (this.running) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        this.running = true;
        this.startTime = Date.now() - this.elapsedTime;
        this.startBtn.textContent = 'Arrêter';
        this.startBtn.classList.add('stop');
        this.resetBtn.disabled = true;
        this.lapBtn.disabled = false;

        this.interval = setInterval(() => this.update(), 10);
    }

    stop() {
        this.running = false;
        this.elapsedTime = Date.now() - this.startTime;
        this.startBtn.textContent = 'Reprendre';
        this.startBtn.classList.remove('stop');
        this.resetBtn.disabled = false;

        clearInterval(this.interval);
    }

    reset() {
        this.running = false;
        this.elapsedTime = 0;
        this.laps = [];
        this.startBtn.textContent = 'Démarrer';
        this.startBtn.classList.remove('stop');
        this.resetBtn.disabled = true;
        this.lapBtn.disabled = true;

        clearInterval(this.interval);
        this.display.innerHTML = '00:00:00<span class="ms">.000</span>';
        this.lapsList.innerHTML = '';
    }

    update() {
        this.elapsedTime = Date.now() - this.startTime;
        this.display.innerHTML = this.formatTime(this.elapsedTime);
    }

    formatTime(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;

        const h = String(hours).padStart(2, '0');
        const m = String(minutes).padStart(2, '0');
        const s = String(seconds).padStart(2, '0');
        const mil = String(milliseconds).padStart(3, '0');

        return `${h}:${m}:${s}<span class="ms">.${mil}</span>`;
    }

    formatTimeSimple(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;

        const h = String(hours).padStart(2, '0');
        const m = String(minutes).padStart(2, '0');
        const s = String(seconds).padStart(2, '0');
        const mil = String(milliseconds).padStart(3, '0');

        return `${h}:${m}:${s}.${mil}`;
    }

    addLap() {
        if (!this.running) return;

        const lapTime = this.elapsedTime;
        const previousLapTime = this.laps.length > 0 ? this.laps[this.laps.length - 1].totalTime : 0;
        const splitTime = lapTime - previousLapTime;

        this.laps.push({
            number: this.laps.length + 1,
            splitTime,
            totalTime: lapTime
        });

        this.renderLaps();
    }

    renderLaps() {
        if (this.laps.length === 0) {
            this.lapsList.innerHTML = '';
            return;
        }

        // Find best and worst laps
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
                    <span class="lap-number">Tour ${lap.number}</span>
                    <span class="lap-time">${this.formatTimeSimple(lap.splitTime)}</span>
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

        this.setupContainer = document.getElementById('timer-setup');
        this.runningContainer = document.getElementById('timer-running');
        this.hoursInput = document.getElementById('timer-hours');
        this.minutesInput = document.getElementById('timer-minutes');
        this.secondsInput = document.getElementById('timer-seconds');
        this.startBtn = document.getElementById('timer-start-btn');
        this.display = document.getElementById('timer-display');
        this.progressCircle = document.getElementById('timer-progress-circle');
        this.cancelBtn = document.getElementById('timer-cancel');
        this.pauseBtn = document.getElementById('timer-pause');
        this.presetBtns = document.querySelectorAll('.preset-btn');
        this.soundSelect = document.getElementById('timer-sound');
        this.customSoundGroup = document.getElementById('timer-custom-sound-group');
        this.customSoundInput = document.getElementById('timer-custom-sound-input');
        this.customSoundName = document.getElementById('timer-custom-sound-name');

        // Finished modal
        this.finishedModal = document.getElementById('timer-finished-modal');
        this.finishedDuration = document.getElementById('timer-finished-duration');
        this.dismissBtn = document.getElementById('timer-dismiss-btn');

        this.running = false;
        this.paused = false;
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.interval = null;
        this.customSoundData = null;
        this.initialDuration = '';

        this.initEventListeners();
    }

    initEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.cancelBtn.addEventListener('click', () => this.cancel());
        this.pauseBtn.addEventListener('click', () => this.togglePause());

        // Dismiss button - use pointerup for unified touch/mouse support
        const handleTimerDismiss = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Timer dismiss button pressed');
            this.dismiss();
        };
        this.dismissBtn.addEventListener('pointerup', handleTimerDismiss);
        this.dismissBtn.addEventListener('click', handleTimerDismiss);

        // Preset buttons
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const minutes = parseInt(btn.dataset.minutes);
                this.hoursInput.value = 0;
                this.minutesInput.value = minutes;
                this.secondsInput.value = 0;
            });
        });

        // Sound selection
        this.soundSelect.addEventListener('change', () => {
            this.customSoundGroup.style.display =
                this.soundSelect.value === 'custom' ? 'block' : 'none';
        });

        // Custom sound upload
        this.customSoundInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                this.customSoundName.textContent = file.name;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.customSoundData = ev.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        // Input validation and keyboard support
        [this.hoursInput, this.minutesInput, this.secondsInput].forEach(input => {
            input.addEventListener('input', () => this.validateTimerInput(input));
            input.addEventListener('keydown', (e) => this.handleTimerKeydown(e));
            input.addEventListener('focus', (e) => e.target.select());
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById('timer-tab').classList.contains('active')) return;
            if (e.target.tagName === 'INPUT' && !this.running) return;

            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                if (this.running) {
                    this.togglePause();
                } else if (!this.finishedModal.classList.contains('active')) {
                    this.start();
                }
            } else if (e.key === 'Escape') {
                if (this.finishedModal.classList.contains('active')) {
                    this.dismiss();
                } else if (this.running) {
                    this.cancel();
                }
            }
        });
    }

    validateTimerInput(input) {
        let value = parseInt(input.value) || 0;
        const max = parseInt(input.max);
        const min = parseInt(input.min);

        if (value > max) value = max;
        if (value < min) value = min;

        input.value = value;
    }

    handleTimerKeydown(e) {
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
        this.pauseBtn.textContent = 'Pause';

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

        this.display.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Update progress circle
        const progress = this.remainingSeconds / this.totalSeconds;
        const circumference = 2 * Math.PI * 45; // radius = 45
        const offset = circumference * (1 - progress);
        this.progressCircle.style.strokeDashoffset = offset;
    }

    togglePause() {
        this.paused = !this.paused;
        this.pauseBtn.textContent = this.paused ? 'Reprendre' : 'Pause';
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

        // Play sound
        const soundType = this.soundSelect.value;
        if (soundType === 'custom' && this.customSoundData) {
            this.audioManager.play('custom', this.customSoundData);
        } else {
            this.audioManager.play(soundType);
        }

        // Show notification
        this.notificationManager.show('Minuteur terminé !', {
            body: `Le minuteur de ${this.initialDuration} est écoulé`,
            tag: 'timer-finished'
        });

        // Show finished modal
        this.finishedDuration.textContent = this.initialDuration;
        this.finishedModal.classList.add('active');
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
        console.log('Timer dismiss called');
        this.audioManager.stopAll();
        this.finishedModal.classList.remove('active');
        this.setupContainer.style.display = 'block';
        this.runningContainer.style.display = 'none';

        // Reset progress circle
        this.progressCircle.style.strokeDashoffset = 0;
        console.log('Timer dismissed, modal closed');
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

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;

            if (e.key === '1') this.switchTab('clock');
            else if (e.key === '2') this.switchTab('alarm');
            else if (e.key === '3') this.switchTab('stopwatch');
            else if (e.key === '4') this.switchTab('timer');
        });
    }

    switchTab(tabName) {
        // Update nav buttons
        this.navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
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
        this.navigation = new TabNavigation();

        // Request notification permission on first interaction
        document.addEventListener('click', () => {
            this.notificationManager.requestPermission();
        }, { once: true });

        console.log('Alarm Clock App initialized');
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
});
