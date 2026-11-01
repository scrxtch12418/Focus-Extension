// Focus Command Center — Main Side Panel & Popup Controller

// ============================================================================
// Safe Background Message Sender (Prevents "message port closed" console errors)
// ============================================================================
function sendBgMessage(msg, callback) {
    try {
        chrome.runtime.sendMessage(msg, (response) => {
            if (chrome.runtime.lastError) {
                // Silently swallow disconnected port errors when service worker restarts
                return;
            }
            if (typeof callback === 'function') {
                callback(response);
            }
        });
    } catch (e) {
        // Context invalidated or extension reloading
    }
}

// ============================================================================
// 1. Lucide Icons Injection
// ============================================================================
function injectLucideIcons() {
    if (typeof getLucideSvg !== 'function') return;

    const brandIcon = document.getElementById('brandIcon');
    if (brandIcon) brandIcon.innerHTML = getLucideSvg('sparkles', 18);

    const themeBtnIcon = document.getElementById('themeBtnIcon');
    if (themeBtnIcon) themeBtnIcon.innerHTML = getLucideSvg('palette', 16);

    const popOutBtnIcon = document.getElementById('popOutBtnIcon');
    if (popOutBtnIcon) popOutBtnIcon.innerHTML = getLucideSvg('external-link', 16);

    const streakIcon = document.getElementById('streakIcon');
    if (streakIcon) streakIcon.innerHTML = getLucideSvg('flame', 18);

    const focusedIcon = document.getElementById('focusedIcon');
    if (focusedIcon) focusedIcon.innerHTML = getLucideSvg('clock', 18);

    const interceptedIcon = document.getElementById('interceptedIcon');
    if (interceptedIcon) interceptedIcon.innerHTML = getLucideSvg('shield-alert', 18);

    const discCenterIcon = document.getElementById('discCenterIcon');
    if (discCenterIcon) discCenterIcon.innerHTML = getLucideSvg('music', 18);

    const prevIcon = document.getElementById('prevIcon');
    if (prevIcon) prevIcon.innerHTML = getLucideSvg('skip-back', 18);

    const playPauseIcon = document.getElementById('playPauseIcon');
    if (playPauseIcon) playPauseIcon.innerHTML = getLucideSvg('play', 22);

    const nextIcon = document.getElementById('nextIcon');
    if (nextIcon) nextIcon.innerHTML = getLucideSvg('skip-forward', 18);

    const volumeIcon = document.getElementById('volumeIcon');
    if (volumeIcon) volumeIcon.innerHTML = getLucideSvg('volume-2', 15);

    const targetGoalIcon = document.getElementById('targetGoalIcon');
    if (targetGoalIcon) targetGoalIcon.innerHTML = getLucideSvg('target', 14);

    const checkDoneIcon = document.getElementById('checkDoneIcon');
    if (checkDoneIcon) checkDoneIcon.innerHTML = getLucideSvg('check', 12);

    const minusIcon = document.getElementById('minusIcon');
    if (minusIcon) minusIcon.innerHTML = getLucideSvg('minus', 16);

    const plusIcon = document.getElementById('plusIcon');
    if (plusIcon) plusIcon.innerHTML = getLucideSvg('plus', 16);

    const resetIcon = document.getElementById('resetIcon');
    if (resetIcon) resetIcon.innerHTML = getLucideSvg('rotate-ccw', 16);

    const headphonesIcon = document.getElementById('headphonesIcon');
    if (headphonesIcon) headphonesIcon.innerHTML = getLucideSvg('headphones', 16);

    const rulesSettingsIcon = document.getElementById('rulesSettingsIcon');
    if (rulesSettingsIcon) rulesSettingsIcon.innerHTML = getLucideSvg('sliders', 16);

    const tasksHeaderIcon = document.getElementById('tasksHeaderIcon');
    if (tasksHeaderIcon) tasksHeaderIcon.innerHTML = getLucideSvg('list-todo', 18);

    const addTaskIcon = document.getElementById('addTaskIcon');
    if (addTaskIcon) addTaskIcon.innerHTML = getLucideSvg('plus', 18);

    const themeModalHeaderIcon = document.getElementById('themeModalHeaderIcon');
    if (themeModalHeaderIcon) themeModalHeaderIcon.innerHTML = getLucideSvg('sparkles', 18);

    const closeThemeIcon = document.getElementById('closeThemeIcon');
    if (closeThemeIcon) closeThemeIcon.innerHTML = getLucideSvg('x', 16);
}

injectLucideIcons();

// --- Pop-out Floating Window Logic ---
const popOutBtn = document.getElementById('popOutBtn');
if (popOutBtn) {
    popOutBtn.addEventListener('click', () => {
        const extensionUrl = chrome.runtime.getURL('sidepanel/index.html');
        chrome.windows.create({
            url: extensionUrl,
            type: 'popup',
            width: 400,
            height: 750,
            focused: true
        });
    });
}

// ============================================================================
// 2. Arc-Style Theme Studio (2D Chromatic Grid Color Picker)
// ============================================================================
const openThemeBtn = document.getElementById('openThemeBtn');
const closeThemeBtn = document.getElementById('closeThemeBtn');
const themeModal = document.getElementById('themeModal');
const resetThemeBtn = document.getElementById('resetThemeBtn');
const arcColorGrid = document.getElementById('arcColorGrid');
const arcPickerHandle = document.getElementById('arcPickerHandle');
const themeHslValue = document.getElementById('themeHslValue');
const themeColorName = document.getElementById('themeColorName');
const presetPills = document.querySelectorAll('.preset-pill');

let isDraggingGrid = false;
let currentTheme = { h: 267, s: 83, l: 60 };

function applyTheme(h, s, l, save = true) {
    currentTheme = { h, s, l };
    document.documentElement.style.setProperty('--theme-h', h.toString());
    document.documentElement.style.setProperty('--theme-s', `${s}%`);
    document.documentElement.style.setProperty('--theme-l', `${l}%`);

    if (themeHslValue) themeHslValue.textContent = `HSL: ${h}°, ${s}%, ${l}%`;

    if (save) {
        chrome.storage.local.set({ customTheme: currentTheme });
    }
}

function updateHandleFromCoords(x, y) {
    if (!arcColorGrid || !arcPickerHandle) return;
    const rect = arcColorGrid.getBoundingClientRect();
    const clampedX = Math.max(0, Math.min(rect.width, x));
    const clampedY = Math.max(0, Math.min(rect.height, y));

    const percentX = clampedX / rect.width;
    const percentY = clampedY / rect.height;

    arcPickerHandle.style.left = `${clampedX}px`;
    arcPickerHandle.style.top = `${clampedY}px`;

    const h = Math.round(percentX * 360);
    const s = Math.round(92 - (percentY * 22));
    const l = Math.round(72 - (percentY * 34));

    applyTheme(h, s, l, true);
}

function setHandleFromHsl(h, s, l) {
    if (!arcColorGrid || !arcPickerHandle) return;
    const rect = arcColorGrid.getBoundingClientRect();
    if (rect.width === 0) return;

    const percentX = (h % 360) / 360;
    const percentY = Math.max(0, Math.min(1, (72 - l) / 34));

    arcPickerHandle.style.left = `${percentX * rect.width}px`;
    arcPickerHandle.style.top = `${percentY * rect.height}px`;
}

if (openThemeBtn && themeModal) {
    openThemeBtn.addEventListener('click', () => {
        themeModal.style.display = 'flex';
        setTimeout(() => {
            setHandleFromHsl(currentTheme.h, currentTheme.s, currentTheme.l);
        }, 50);
    });
}

if (closeThemeBtn && themeModal) {
    closeThemeBtn.addEventListener('click', () => {
        themeModal.style.display = 'none';
    });
}

if (themeModal) {
    themeModal.addEventListener('click', (e) => {
        if (e.target === themeModal) themeModal.style.display = 'none';
    });
}

if (arcColorGrid) {
    function handlePointer(e) {
        const rect = arcColorGrid.getBoundingClientRect();
        updateHandleFromCoords(e.clientX - rect.left, e.clientY - rect.top);
    }

    arcColorGrid.addEventListener('pointerdown', (e) => {
        isDraggingGrid = true;
        arcColorGrid.setPointerCapture(e.pointerId);
        handlePointer(e);
    });

    arcColorGrid.addEventListener('pointermove', (e) => {
        if (isDraggingGrid) {
            handlePointer(e);
        }
    });

    arcColorGrid.addEventListener('pointerup', (e) => {
        isDraggingGrid = false;
        try { arcColorGrid.releasePointerCapture(e.pointerId); } catch (err) {}
    });

    arcColorGrid.addEventListener('pointercancel', () => {
        isDraggingGrid = false;
    });
}

if (presetPills) {
    presetPills.forEach(pill => {
        pill.addEventListener('click', () => {
            const h = parseInt(pill.dataset.h, 10);
            const s = parseInt(pill.dataset.s, 10);
            const l = parseInt(pill.dataset.l, 10);
            applyTheme(h, s, l, true);
            setHandleFromHsl(h, s, l);
            if (themeColorName) themeColorName.textContent = pill.textContent.trim();
        });
    });
}

if (resetThemeBtn) {
    resetThemeBtn.addEventListener('click', () => {
        applyTheme(267, 83, 60, true);
        setHandleFromHsl(267, 83, 60);
        if (themeColorName) themeColorName.textContent = 'Catppuccin Mauve';
    });
}

chrome.storage.local.get(['customTheme'], (res) => {
    if (res.customTheme) {
        applyTheme(res.customTheme.h, res.customTheme.s, res.customTheme.l, false);
    }
});

// ============================================================================
// 3. Daily Analytics & Streaks UI
// ============================================================================
const streakCount = document.getElementById('streakCount');
const todayFocusTime = document.getElementById('todayFocusTime');
const todayIntercepted = document.getElementById('todayIntercepted');

function formatFocusDuration(totalSeconds) {
    if (!totalSeconds || totalSeconds < 60) return `${totalSeconds || 0}s`;
    const mins = Math.floor(totalSeconds / 60);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
        return `${hrs}h ${remMins}m`;
    }
    return `${mins}m`;
}

function updateAnalyticsUI(analytics) {
    if (!analytics) return;
    if (streakCount) streakCount.textContent = analytics.streak || 0;
    if (todayFocusTime) todayFocusTime.textContent = formatFocusDuration(analytics.todayFocusSeconds);
    if (todayIntercepted) todayIntercepted.textContent = analytics.todayShortsIntercepted || 0;
}

sendBgMessage({ type: 'GET_ANALYTICS' }, (res) => {
    if (res) updateAnalyticsUI(res);
});

// ============================================================================
// 4. Music & Media Player (Fixed & Unified)
// ============================================================================
const playPauseBtn = document.getElementById('playPause');
const nextBtn = document.getElementById('next');
const prevBtn = document.getElementById('prev');
const playPauseIcon = document.getElementById('playPauseIcon');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const vinylDisc = document.getElementById('vinylDisc');
const soundscapeSelect = document.getElementById('soundscapeSelect');
const soundscapeVolume = document.getElementById('soundscapeVolume');
const volumePercent = document.getElementById('volumePercent');

let isMusicPlaying = false;
let currentSoundscape = 'lofi';
let currentVolume = 0.5;

function setMediaPlayingUI(playing, title, artist) {
    isMusicPlaying = playing;
    if (playPauseIcon) {
        playPauseIcon.innerHTML = playing ? getLucideSvg('pause', 22) : getLucideSvg('play', 22);
    }
    if (vinylDisc) {
        if (playing) vinylDisc.classList.add('playing');
        else vinylDisc.classList.remove('playing');
    }
    if (title && trackTitle) trackTitle.textContent = title;
    if (artist && trackArtist) trackArtist.textContent = artist;
}

function updateMediaUI() {
    sendBgMessage({ type: 'GET_MEDIA_INFO' }, (info) => {
        if (!info) return;
        setMediaPlayingUI(info.isPlaying, info.title, info.artist);
        if (info.soundscape && soundscapeSelect) {
            soundscapeSelect.value = info.soundscape;
            currentSoundscape = info.soundscape;
        }
    });
}
updateMediaUI();
setInterval(updateMediaUI, 3000);

if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
        sendBgMessage({ type: 'MEDIA_COMMAND', action: 'playpause' });
        setMediaPlayingUI(!isMusicPlaying);
    });
}

if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        sendBgMessage({ type: 'MEDIA_COMMAND', action: 'next' });
    });
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        sendBgMessage({ type: 'MEDIA_COMMAND', action: 'prev' });
    });
}

if (soundscapeSelect) {
    soundscapeSelect.addEventListener('change', (e) => {
        currentSoundscape = e.target.value;
        chrome.storage.local.set({ currentSoundscape });
        sendBgMessage({
            type: 'PLAY_SOUNDSCAPE',
            soundscape: currentSoundscape,
            volume: currentVolume
        });
        setMediaPlayingUI(true);
    });
}

if (soundscapeVolume) {
    soundscapeVolume.addEventListener('input', (e) => {
        currentVolume = parseInt(e.target.value, 10) / 100;
        if (volumePercent) volumePercent.textContent = `${e.target.value}%`;
        sendBgMessage({
            type: 'SET_AMBIENT_VOLUME',
            volume: currentVolume
        });
        chrome.storage.local.set({ ambientVolume: currentVolume });
    });
}

chrome.storage.local.get(['ambientPlaying', 'currentSoundscape', 'ambientVolume'], (res) => {
    if (res.ambientPlaying !== undefined) isMusicPlaying = res.ambientPlaying;
    if (res.currentSoundscape) {
        currentSoundscape = res.currentSoundscape;
        if (soundscapeSelect) soundscapeSelect.value = currentSoundscape;
    }
    if (res.ambientVolume !== undefined) {
        currentVolume = res.ambientVolume;
        if (soundscapeVolume) soundscapeVolume.value = Math.round(currentVolume * 100);
        if (volumePercent) volumePercent.textContent = `${Math.round(currentVolume * 100)}%`;
    }
    setMediaPlayingUI(isMusicPlaying);
});

// ============================================================================
// 5. Pomodoro Timer Logic
// ============================================================================
let timeLeft = 25 * 60;
let currentMode = 'focus';
let currentIsRunning = false;

const timerDisplay = document.getElementById('timer');
const incBtn = document.getElementById('incTime');
const decBtn = document.getElementById('decTime');
const startBtn = document.getElementById('startTimer');
const restartBtn = document.getElementById('restartTimer');
const completedDisplay = document.getElementById('completedSessions');
const sessionTargetInput = document.getElementById('sessionTarget');

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    if (timerDisplay) {
        timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function applyModeAndRunning(mode, isRunning) {
    if (mode) currentMode = mode;
    if (isRunning !== undefined) currentIsRunning = isRunning;

    if (currentMode === 'break') {
        document.body.classList.add('break-mode');
        if (startBtn) {
            startBtn.textContent = currentIsRunning ? 'Pause Break' : 'Resume Break';
            startBtn.style.background = currentIsRunning ? 'var(--ctp-red)' : 'var(--ctp-teal)';
        }
    } else {
        document.body.classList.remove('break-mode');
        if (startBtn) {
            startBtn.textContent = currentIsRunning ? 'Pause Session' : 'Start Focus';
            startBtn.style.background = currentIsRunning ? 'var(--ctp-red)' : 'var(--accent)';
        }
    }
}

sendBgMessage({ type: 'GET_STATUS' }, (response) => {
    if (response) {
        timeLeft = response.timeLeft;
        updateTimerDisplay();
        applyModeAndRunning(response.mode, response.isRunning);
        if (response.completedSessions !== undefined && completedDisplay) {
            completedDisplay.textContent = response.completedSessions;
        }
        if (response.sessionTarget !== undefined && sessionTargetInput) {
            sessionTargetInput.value = response.sessionTarget;
        }
    }
});

if (startBtn) {
    startBtn.addEventListener('click', () => {
        sendBgMessage({ type: 'GET_STATUS' }, (response) => {
            if (response && response.isRunning) {
                sendBgMessage({ type: 'STOP_TIMER' });
            } else {
                sendBgMessage({ type: 'START_TIMER' });
            }
        });
    });
}

if (incBtn) {
    incBtn.addEventListener('click', () => {
        if (!currentIsRunning && currentMode === 'focus') {
            timeLeft += 60;
            updateTimerDisplay();
            sendBgMessage({ type: 'SET_TIME', time: timeLeft });
        }
    });
}

if (decBtn) {
    decBtn.addEventListener('click', () => {
        if (!currentIsRunning && currentMode === 'focus' && timeLeft >= 120) {
            timeLeft -= 60;
            updateTimerDisplay();
            sendBgMessage({ type: 'SET_TIME', time: timeLeft });
        }
    });
}

if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        sendBgMessage({ type: 'RESET_TIMER' });
    });
}

if (sessionTargetInput) {
    sessionTargetInput.addEventListener('change', () => {
        const target = Math.max(1, parseInt(sessionTargetInput.value, 10) || 1);
        sessionTargetInput.value = target;
        sendBgMessage({ type: 'SET_SESSION_TARGET', target });
        chrome.storage.local.set({ sessionTarget: target });
    });
}

// Runtime Listener for Broadcasts
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TICK' || message.type === 'TIMER_FINISHED' || message.type === 'TIMER_RESET') {
        if (message.timeLeft !== undefined) {
            timeLeft = message.timeLeft;
            updateTimerDisplay();
        }
        if (message.mode !== undefined || message.isRunning !== undefined) {
            applyModeAndRunning(message.mode, message.isRunning);
        }
        if (message.completedSessions !== undefined && completedDisplay) {
            completedDisplay.textContent = message.completedSessions;
        }
    } else if (message.type === 'ANALYTICS_UPDATE') {
        updateAnalyticsUI(message.analytics);
    } else if (message.type === 'AMBIENT_STATE_CHANGED') {
        setMediaPlayingUI(message.isPlaying);
        if (message.soundscape && soundscapeSelect) {
            soundscapeSelect.value = message.soundscape;
            currentSoundscape = message.soundscape;
        }
        if (message.volume !== undefined && soundscapeVolume) {
            soundscapeVolume.value = Math.round(message.volume * 100);
            if (volumePercent) volumePercent.textContent = `${Math.round(message.volume * 100)}%`;
        }
    }
    return false;
});

// ============================================================================
// 6. Focus Rules & Settings
// ============================================================================
const settingsBtn = document.getElementById('toggleSettings');
const settingsMenu = document.getElementById('settingsMenu');
const toggleSettingsLabel = document.getElementById('toggleSettingsLabel');

if (settingsBtn && settingsMenu) {
    settingsBtn.addEventListener('click', () => {
        const isActive = settingsMenu.classList.toggle('active');
        if (toggleSettingsLabel) {
            toggleSettingsLabel.textContent = isActive ? 'Close Rules' : 'Focus Rules';
        }
        const iconSpan = document.getElementById('rulesSettingsIcon');
        if (iconSpan) {
            iconSpan.innerHTML = isActive ? getLucideSvg('x', 16) : getLucideSvg('sliders', 16);
        }
    });
}

const blockAllToggle = document.getElementById('blockAll');
const blockedSitesArea = document.getElementById('blockedSites');

function saveBlockSettings() {
    const sites = (blockedSitesArea?.value || '').split('\n');
    sendBgMessage({
        type: 'UPDATE_BLOCK_SETTINGS',
        blockAll: !!blockAllToggle?.checked,
        blockedSites: sites
    });

    chrome.storage.local.set({
        blockAll: !!blockAllToggle?.checked,
        blockedSites: blockedSitesArea?.value || ''
    });
}

if (blockAllToggle) blockAllToggle.addEventListener('change', saveBlockSettings);
if (blockedSitesArea) blockedSitesArea.addEventListener('input', saveBlockSettings);

chrome.storage.local.get(['blockAll', 'blockedSites'], (res) => {
    if (res.blockAll !== undefined && blockAllToggle) blockAllToggle.checked = res.blockAll;
    if (res.blockedSites !== undefined && blockedSitesArea) blockedSitesArea.value = res.blockedSites;
});

const removeJSToggle = document.getElementById('removeJS');
if (removeJSToggle) {
    removeJSToggle.addEventListener('change', async (e) => {
        chrome.storage.local.set({ cleanseActive: e.target.checked });
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'TRIGGER_CLEANSE',
                    state: e.target.checked
                }).catch(() => {});
            }
        } catch (err) {}
    });

    chrome.storage.local.get(['cleanseActive'], (res) => {
        if (res.cleanseActive) removeJSToggle.checked = true;
    });
}

const doomscrollToggle = document.getElementById('doomscrollToggle');
if (doomscrollToggle) {
    chrome.storage.local.get(['doomscrollEnabled'], (res) => {
        doomscrollToggle.checked = res.doomscrollEnabled !== false;
    });
    doomscrollToggle.addEventListener('change', (e) => {
        chrome.storage.local.set({ doomscrollEnabled: e.target.checked });
    });
}

const shortsAllowance = document.getElementById('shortsAllowance');
if (shortsAllowance) {
    chrome.storage.local.get(['shortsBudgetMinutes'], (res) => {
        if (res.shortsBudgetMinutes !== undefined) {
            shortsAllowance.value = res.shortsBudgetMinutes.toString();
        }
    });
    shortsAllowance.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        chrome.storage.local.set({ shortsBudgetMinutes: val });
    });
}

const timerChimeToggle = document.getElementById('timerChimeToggle');
if (timerChimeToggle) {
    chrome.storage.local.get(['timerChimeEnabled'], (res) => {
        timerChimeToggle.checked = res.timerChimeEnabled !== false;
    });
    timerChimeToggle.addEventListener('change', (e) => {
        chrome.storage.local.set({ timerChimeEnabled: e.target.checked });
    });
}

// ============================================================================
// 7. Focus Tasks & Goals Logic
// ============================================================================
let tasks = [];
let activeTaskId = null;
let currentFilter = 'all';

const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const todoList = document.getElementById('todoList');
const todoBadge = document.getElementById('todoBadge');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const filterBtns = document.querySelectorAll('.filter-btn');
const activeFocusContainer = document.getElementById('activeFocusContainer');
const activeFocusText = document.getElementById('activeFocusText');
const quickCompleteTaskBtn = document.getElementById('quickCompleteTaskBtn');

function loadTasks() {
    chrome.storage.local.get(['tasks', 'activeTaskId'], (res) => {
        tasks = Array.isArray(res.tasks) ? res.tasks : [];
        activeTaskId = res.activeTaskId || null;
        renderActiveFocus();
        renderTasks();
    });
}

function saveTasks() {
    chrome.storage.local.set({ tasks, activeTaskId }, () => {
        renderActiveFocus();
        renderTasks();
    });
}

function getActiveTask() {
    if (!activeTaskId) return null;
    return tasks.find(t => t.id === activeTaskId && !t.completed) || null;
}

function renderActiveFocus() {
    let activeTask = getActiveTask();

    if (!activeTask) {
        const candidate = tasks.find(t => t.isPinned && !t.completed) || tasks.find(t => !t.completed);
        if (candidate) {
            activeTaskId = candidate.id;
            activeTask = candidate;
        } else {
            activeTaskId = null;
        }
    }

    if (activeTask) {
        if (activeFocusText) activeFocusText.textContent = activeTask.text;
        if (activeFocusContainer) activeFocusContainer.classList.add('has-focus');
        if (quickCompleteTaskBtn) quickCompleteTaskBtn.style.display = 'inline-flex';
    } else {
        if (activeFocusText) activeFocusText.textContent = tasks.length === 0 ? 'Add a task below to focus' : 'All tasks completed! 🎉';
        if (activeFocusContainer) activeFocusContainer.classList.remove('has-focus');
        if (quickCompleteTaskBtn) quickCompleteTaskBtn.style.display = 'none';
    }
}

function renderTasks() {
    if (!todoList) return;
    todoList.innerHTML = '';

    const completedCount = tasks.filter(t => t.completed).length;
    if (todoBadge) todoBadge.textContent = `${completedCount}/${tasks.length}`;

    let filtered = tasks;
    if (currentFilter === 'active') {
        filtered = tasks.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filtered = tasks.filter(t => t.completed);
    }

    if (filtered.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'todo-empty';
        if (currentFilter === 'completed') {
            empty.textContent = 'No completed tasks yet.';
        } else if (currentFilter === 'active') {
            empty.textContent = tasks.length > 0 ? 'All caught up! Nice work. 🌟' : 'No tasks yet. Add one above!';
        } else {
            empty.textContent = 'No tasks yet. Add your first goal above!';
        }
        todoList.appendChild(empty);
        return;
    }

    filtered.forEach(task => {
        const li = document.createElement('li');
        const isActive = (task.id === activeTaskId && !task.completed);
        li.className = `todo-item ${task.completed ? 'completed' : ''} ${isActive ? 'active-focus' : ''}`;

        const pinBtn = document.createElement('button');
        pinBtn.type = 'button';
        pinBtn.className = `todo-pin-btn ${task.isPinned && !task.completed ? 'pinned' : ''}`;
        pinBtn.title = task.isPinned ? 'Unpin focus goal' : 'Set as current focus goal';
        pinBtn.innerHTML = getLucideSvg('star', 15);
        pinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePinTask(task.id);
        });

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = !!task.completed;
        checkbox.addEventListener('change', () => {
            toggleTask(task.id);
        });

        const textSpan = document.createElement('span');
        textSpan.className = 'todo-text';
        textSpan.textContent = task.text;

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'todo-delete-btn';
        delBtn.title = 'Delete task';
        delBtn.innerHTML = getLucideSvg('trash-2', 15);
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });

        li.appendChild(pinBtn);
        li.appendChild(checkbox);
        li.appendChild(textSpan);
        li.appendChild(delBtn);

        todoList.appendChild(li);
    });
}

function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const shouldPin = tasks.filter(t => !t.completed).length === 0;
    const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        text: trimmed,
        completed: false,
        isPinned: shouldPin,
        createdAt: Date.now()
    };

    tasks.unshift(newTask);
    if (shouldPin) {
        activeTaskId = newTask.id;
    }
    saveTasks();
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    if (task.completed) {
        task.isPinned = false;
        if (activeTaskId === id) activeTaskId = null;
    }
    saveTasks();
}

function togglePinTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || task.completed) return;

    if (task.isPinned) {
        task.isPinned = false;
        if (activeTaskId === id) activeTaskId = null;
    } else {
        tasks.forEach(t => t.isPinned = false);
        task.isPinned = true;
        activeTaskId = id;
    }
    saveTasks();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    if (activeTaskId === id) activeTaskId = null;
    saveTasks();
}

if (todoForm) {
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (todoInput) {
            addTask(todoInput.value);
            todoInput.value = '';
            todoInput.focus();
        }
    });
}

if (clearCompletedBtn) {
    clearCompletedBtn.addEventListener('click', () => {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
    });
}

if (filterBtns) {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter || 'all';
            renderTasks();
        });
    });
}

if (quickCompleteTaskBtn) {
    quickCompleteTaskBtn.addEventListener('click', () => {
        const activeTask = getActiveTask();
        if (activeTask) toggleTask(activeTask.id);
    });
}

loadTasks();

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.tasks || changes.activeTaskId)) {
        if (changes.tasks) tasks = changes.tasks.newValue || [];
        if (changes.activeTaskId) activeTaskId = changes.activeTaskId.newValue || null;
        renderActiveFocus();
        renderTasks();
    }
});
