// Focus Command Center — Main Controller (Retro Desktop OS Aesthetic)
// Spacious, Decluttered, Single Unified Layout with Crystal Clear Typography & Zero Emojis

// ============================================================================
// Safe Background Message Sender (Prevents "message port closed" console errors)
// ============================================================================
function sendBgMessage(msg, callback) {
    try {
        chrome.runtime.sendMessage(msg, (response) => {
            const err = chrome.runtime.lastError;
            if (err) {
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
// 1. Lucide Icons Injection (Zero Emojis, Crisp Vector Glyphs)
// ============================================================================
function injectLucideIcons() {
    if (typeof getLucideSvg !== 'function') return;

    const brandIcon = document.getElementById('brandIcon');
    if (brandIcon) brandIcon.innerHTML = getLucideSvg('sparkles', 16);

    const themeBtnIcon = document.getElementById('themeBtnIcon');
    if (themeBtnIcon) themeBtnIcon.innerHTML = getLucideSvg('palette', 14);

    const popOutBtnIcon = document.getElementById('popOutBtnIcon');
    if (popOutBtnIcon) popOutBtnIcon.innerHTML = getLucideSvg('external-link', 14);

    const spotifyHeaderIcon = document.getElementById('spotifyHeaderIcon');
    if (spotifyHeaderIcon) spotifyHeaderIcon.innerHTML = getLucideSvg('music', 15);

    const ambientHeaderIcon = document.getElementById('ambientHeaderIcon');
    if (ambientHeaderIcon) ambientHeaderIcon.innerHTML = getLucideSvg('headphones', 15);

    const timerHeaderIcon = document.getElementById('timerHeaderIcon');
    if (timerHeaderIcon) timerHeaderIcon.innerHTML = getLucideSvg('clock', 15);

    const tasksHeaderIcon = document.getElementById('tasksHeaderIcon');
    if (tasksHeaderIcon) tasksHeaderIcon.innerHTML = getLucideSvg('list-todo', 15);

    const analyticsHeaderIcon = document.getElementById('analyticsHeaderIcon');
    if (analyticsHeaderIcon) analyticsHeaderIcon.innerHTML = getLucideSvg('flame', 15);

    const rulesHeaderIcon = document.getElementById('rulesHeaderIcon');
    if (rulesHeaderIcon) rulesHeaderIcon.innerHTML = getLucideSvg('sliders', 15);

    const streakIcon = document.getElementById('streakIcon');
    if (streakIcon) streakIcon.innerHTML = getLucideSvg('flame', 18);

    const focusedIcon = document.getElementById('focusedIcon');
    if (focusedIcon) focusedIcon.innerHTML = getLucideSvg('clock', 18);

    const interceptedIcon = document.getElementById('interceptedIcon');
    if (interceptedIcon) interceptedIcon.innerHTML = getLucideSvg('shield-alert', 18);

    const discCenterIcon = document.getElementById('discCenterIcon');
    if (discCenterIcon) discCenterIcon.innerHTML = getLucideSvg('music', 22);

    const prevIcon = document.getElementById('prevIcon');
    if (prevIcon) prevIcon.innerHTML = getLucideSvg('skip-back', 16);

    const playPauseIcon = document.getElementById('playPauseIcon');
    if (playPauseIcon) playPauseIcon.innerHTML = getLucideSvg('play', 18);

    const nextIcon = document.getElementById('nextIcon');
    if (nextIcon) nextIcon.innerHTML = getLucideSvg('skip-forward', 16);

    const ambientPlayIcon = document.getElementById('ambientPlayIcon');
    if (ambientPlayIcon) ambientPlayIcon.innerHTML = getLucideSvg('play', 14);

    const volumeIcon = document.getElementById('volumeIcon');
    if (volumeIcon) volumeIcon.innerHTML = getLucideSvg('volume-2', 13);

    const checkDoneIcon = document.getElementById('checkDoneIcon');
    if (checkDoneIcon) checkDoneIcon.innerHTML = getLucideSvg('check', 12);

    const minusIcon = document.getElementById('minusIcon');
    if (minusIcon) minusIcon.innerHTML = getLucideSvg('minus', 15);

    const plusIcon = document.getElementById('plusIcon');
    if (plusIcon) plusIcon.innerHTML = getLucideSvg('plus', 15);

    const resetIcon = document.getElementById('resetIcon');
    if (resetIcon) resetIcon.innerHTML = getLucideSvg('rotate-ccw', 15);

    const addTaskIcon = document.getElementById('addTaskIcon');
    if (addTaskIcon) addTaskIcon.innerHTML = getLucideSvg('plus', 13);

    const themeModalHeaderIcon = document.getElementById('themeModalHeaderIcon');
    if (themeModalHeaderIcon) themeModalHeaderIcon.innerHTML = getLucideSvg('palette', 15);

    const closeThemeIcon = document.getElementById('closeThemeIcon');
    if (closeThemeIcon) closeThemeIcon.innerHTML = getLucideSvg('x', 13);
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
            width: 580,
            height: 820,
            focused: true
        });
    });
}

// ============================================================================
// 2. Retro Theme Selector Engine (Sage, Catppuccin, Dracula, Nord, etc.)
// ============================================================================
const openThemeBtn = document.getElementById('openThemeBtn');
const closeThemeBtn = document.getElementById('closeThemeBtn');
const themeModal = document.getElementById('themeModal');
const themeCardOptions = document.querySelectorAll('.theme-card-option');

const RETRO_THEMES = ['sage', 'mocha', 'latte', 'dracula', 'nord', 'rosepine', 'tokyonight', 'amber'];
let currentTheme = 'sage';

function applyRetroTheme(themeName, save = true) {
    if (!RETRO_THEMES.includes(themeName)) themeName = 'sage';
    currentTheme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);

    themeCardOptions.forEach(opt => {
        if (opt.dataset.theme === themeName) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    if (save) {
        chrome.storage.local.set({ retroTheme: currentTheme });
    }
}

if (openThemeBtn && themeModal) {
    openThemeBtn.addEventListener('click', () => {
        themeModal.style.display = 'flex';
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

themeCardOptions.forEach(card => {
    card.addEventListener('click', () => {
        const selected = card.dataset.theme;
        applyRetroTheme(selected, true);
    });
});

chrome.storage.local.get(['retroTheme'], (res) => {
    applyRetroTheme(res.retroTheme || 'sage', false);
});

// ============================================================================
// 3. YouTube & Spotify Player with Live Video Seek Slider & Thumbnail
// ============================================================================
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const mediaPlatformBadge = document.getElementById('mediaPlatformBadge');
const mediaThumbnailImg = document.getElementById('mediaThumbnailImg');
const mediaThumbPlaceholder = document.getElementById('mediaThumbPlaceholder');
const videoSeekSlider = document.getElementById('videoSeekSlider');
const videoCurrentTime = document.getElementById('videoCurrentTime');
const videoTotalDuration = document.getElementById('videoTotalDuration');
const playPauseBtn = document.getElementById('playPause');
const playPauseIcon = document.getElementById('playPauseIcon');
const nextBtn = document.getElementById('next');
const prevBtn = document.getElementById('prev');

let isUserSeeking = false;
let isMediaPlaying = false;

function formatMediaTime(totalSeconds) {
    if (!totalSeconds || isNaN(totalSeconds)) return '00:00';
    const s = Math.floor(totalSeconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
        return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateMediaUI() {
    sendBgMessage({ type: 'GET_MEDIA_INFO' }, (info) => {
        if (!info) return;

        isMediaPlaying = !!info.isPlaying;
        if (playPauseIcon) {
            playPauseIcon.innerHTML = isMediaPlaying ? getLucideSvg('pause', 18) : getLucideSvg('play', 18);
        }

        if (trackTitle) trackTitle.textContent = info.title || 'No Media Detected';
        if (trackArtist) trackArtist.textContent = info.artist || 'Play YouTube or Spotify in a tab';

        // Platform Badge
        if (mediaPlatformBadge) {
            if (info.isExternal) {
                const artistLower = (info.artist || '').toLowerCase();
                const titleLower = (info.title || '').toLowerCase();
                if (artistLower.includes('spotify') || titleLower.includes('spotify')) {
                    mediaPlatformBadge.textContent = 'SPOTIFY';
                } else if (artistLower.includes('youtube') || titleLower.includes('youtube')) {
                    mediaPlatformBadge.textContent = 'YOUTUBE';
                } else {
                    mediaPlatformBadge.textContent = 'WEB VIDEO';
                }
            } else {
                mediaPlatformBadge.textContent = 'STANDBY';
            }
        }

        // Live Thumbnail Display
        if (mediaThumbnailImg && mediaThumbPlaceholder) {
            if (info.art) {
                if (mediaThumbnailImg.src !== info.art) {
                    mediaThumbnailImg.src = info.art;
                }
                mediaThumbnailImg.style.display = 'block';
                mediaThumbPlaceholder.style.display = 'none';
            } else {
                mediaThumbnailImg.style.display = 'none';
                mediaThumbPlaceholder.style.display = 'flex';
            }
        }

        // Video Seek Slider Synchronization
        if (!isUserSeeking && videoSeekSlider && videoCurrentTime && videoTotalDuration) {
            const dur = info.duration || 0;
            const cur = info.currentTime || 0;
            videoSeekSlider.max = dur > 0 ? dur : 100;
            videoSeekSlider.value = cur;
            videoCurrentTime.textContent = formatMediaTime(cur);
            videoTotalDuration.textContent = formatMediaTime(dur);
        }
    });
}

updateMediaUI();
setInterval(updateMediaUI, 2000);

// Interactive Video Scrub Slider
if (videoSeekSlider) {
    videoSeekSlider.addEventListener('input', (e) => {
        isUserSeeking = true;
        const val = parseFloat(e.target.value);
        if (videoCurrentTime) videoCurrentTime.textContent = formatMediaTime(val);
    });

    videoSeekSlider.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        sendBgMessage({ type: 'SEEK_MEDIA', time: val });
        setTimeout(() => {
            isUserSeeking = false;
        }, 500);
    });
}

// Media Transport Controls
if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
        sendBgMessage({ type: 'MEDIA_COMMAND', action: 'playpause' });
        isMediaPlaying = !isMediaPlaying;
        if (playPauseIcon) {
            playPauseIcon.innerHTML = isMediaPlaying ? getLucideSvg('pause', 18) : getLucideSvg('play', 18);
        }
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

// ============================================================================
// 4. Dedicated Ambient Soundscapes (Built-in Audio Station with Play/Pause)
// ============================================================================
const ambientStationTitle = document.getElementById('ambientStationTitle');
const ambientPlayPauseBtn = document.getElementById('ambientPlayPauseBtn');
const ambientPlayIcon = document.getElementById('ambientPlayIcon');
const ambientPlayText = document.getElementById('ambientPlayText');
const soundscapeSelect = document.getElementById('soundscapeSelect');
const soundscapeVolume = document.getElementById('soundscapeVolume');
const volumePercent = document.getElementById('volumePercent');

const SOUNDSCAPE_NAMES = {
    'lofi': 'Lofi Chill Radio',
    'rain': 'Rain & Thunder Storm',
    'noise': 'Deep Brown Noise',
    'ocean': 'Ocean Waves',
    'cafe': 'Cozy Cafe Ambience',
    'binaural': '40Hz Gamma Focus'
};

let isAmbientPlaying = false;
let currentSoundscape = 'lofi';
let currentVolume = 0.5;

function setAmbientPlayingUI(playing) {
    isAmbientPlaying = playing;
    if (ambientPlayPauseBtn) {
        ambientPlayPauseBtn.classList.toggle('playing', playing);
    }
    if (ambientPlayIcon) {
        ambientPlayIcon.innerHTML = playing ? getLucideSvg('pause', 14) : getLucideSvg('play', 14);
    }
    if (ambientPlayText) {
        ambientPlayText.textContent = playing ? 'Pause Audio' : 'Play Audio';
    }
    if (ambientStationTitle) {
        ambientStationTitle.textContent = SOUNDSCAPE_NAMES[currentSoundscape] || 'Lofi Chill Radio';
    }
}

if (ambientPlayPauseBtn) {
    ambientPlayPauseBtn.addEventListener('click', () => {
        sendBgMessage({ type: 'TOGGLE_AMBIENT' });
        setAmbientPlayingUI(!isAmbientPlaying);
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
        setAmbientPlayingUI(true);
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
    if (res.ambientPlaying !== undefined) isAmbientPlaying = res.ambientPlaying;
    if (res.currentSoundscape) {
        currentSoundscape = res.currentSoundscape;
        if (soundscapeSelect) soundscapeSelect.value = currentSoundscape;
    }
    if (res.ambientVolume !== undefined) {
        currentVolume = res.ambientVolume;
        if (soundscapeVolume) soundscapeVolume.value = Math.round(currentVolume * 100);
        if (volumePercent) volumePercent.textContent = `${Math.round(currentVolume * 100)}%`;
    }
    setAmbientPlayingUI(isAmbientPlaying);
});

// ============================================================================
// 5. Pomodoro Focus Timer Logic
// ============================================================================
let timeLeft = 25 * 60;
let currentMode = 'focus';
let currentIsRunning = false;
let sessionTotalDuration = 25 * 60;

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
        }
    } else {
        document.body.classList.remove('break-mode');
        if (startBtn) {
            startBtn.textContent = currentIsRunning ? 'Pause Session' : 'Start Focus';
        }
    }
}

sendBgMessage({ type: 'GET_STATUS' }, (response) => {
    if (response) {
        timeLeft = response.timeLeft;
        sessionTotalDuration = response.focusDuration || 25 * 60;
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
            sessionTotalDuration = timeLeft;
            updateTimerDisplay();
            sendBgMessage({ type: 'SET_TIME', time: timeLeft });
        }
    });
}

if (decBtn) {
    decBtn.addEventListener('click', () => {
        if (!currentIsRunning && currentMode === 'focus' && timeLeft >= 120) {
            timeLeft -= 60;
            sessionTotalDuration = timeLeft;
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
        setAmbientPlayingUI(message.isPlaying);
        if (message.soundscape && soundscapeSelect) {
            soundscapeSelect.value = message.soundscape;
            currentSoundscape = message.soundscape;
            if (ambientStationTitle) {
                ambientStationTitle.textContent = SOUNDSCAPE_NAMES[currentSoundscape] || 'Lofi Chill Radio';
            }
        }
        if (message.volume !== undefined && soundscapeVolume) {
            soundscapeVolume.value = Math.round(message.volume * 100);
            if (volumePercent) volumePercent.textContent = `${Math.round(message.volume * 100)}%`;
        }
    }
    if (typeof sendResponse === 'function') {
        sendResponse({ received: true });
    }
    return false;
});

// ============================================================================
// 6. Focus Tasks & Goals Logic
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
        if (quickCompleteTaskBtn) quickCompleteTaskBtn.style.display = 'inline-flex';
    } else {
        if (activeFocusText) activeFocusText.textContent = tasks.length === 0 ? 'No active task set' : 'All tasks completed!';
        if (quickCompleteTaskBtn) quickCompleteTaskBtn.style.display = 'none';
    }
}

function renderTasks() {
    if (!todoList) return;
    todoList.innerHTML = '';

    const completedCount = tasks.filter(t => t.completed).length;
    if (todoBadge) todoBadge.textContent = `[${completedCount}/${tasks.length}]`;

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
            empty.textContent = tasks.length > 0 ? 'All caught up! Nice work.' : 'No tasks yet. Add one above!';
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
        pinBtn.innerHTML = getLucideSvg('star', 14);
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
        delBtn.innerHTML = getLucideSvg('trash-2', 14);
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

// ============================================================================
// 7. Daily Analytics & Streaks UI
// ============================================================================
const streakCount = document.getElementById('streakCount');
const todayFocusTime = document.getElementById('todayFocusTime');
const todayIntercepted = document.getElementById('todayIntercepted');
const dailyGoalProgressFill = document.getElementById('dailyGoalProgressFill');
const dailyGoalProgressPercent = document.getElementById('dailyGoalProgressPercent');

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

    const targetSeconds = 6000;
    const currentSeconds = analytics.todayFocusSeconds || 0;
    const percent = Math.min(100, Math.round((currentSeconds / targetSeconds) * 100));

    if (dailyGoalProgressFill) dailyGoalProgressFill.style.width = `${percent}%`;
    if (dailyGoalProgressPercent) dailyGoalProgressPercent.textContent = `${percent}%`;
}

sendBgMessage({ type: 'GET_ANALYTICS' }, (res) => {
    if (res) updateAnalyticsUI(res);
});

// ============================================================================
// 8. Focus Rules & Settings Logic
// ============================================================================
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
                }, () => {
                    const _ = chrome.runtime.lastError;
                });
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
