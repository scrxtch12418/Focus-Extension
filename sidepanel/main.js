// --- Pop-out Window Logic ---
const popOutBtn = document.getElementById('popOutBtn');

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

// --- Settings Toggle ---
const settingsBtn = document.getElementById('toggleSettings');
const settingsMenu = document.getElementById('settingsMenu');

settingsBtn.addEventListener('click', () => {
    const isActive = settingsMenu.classList.toggle('active');
    settingsBtn.textContent = isActive ? 'Close Rules ✖' : 'Focus Rules ⚙️';
});

// ============================================================================
// Daily Analytics & Streaks UI
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

chrome.runtime.sendMessage({ type: 'GET_ANALYTICS' }, (res) => {
    if (res) updateAnalyticsUI(res);
});

// ============================================================================
// Pomodoro Timer Logic
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

function updateDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function applyModeAndRunning(mode, isRunning) {
    if (mode) currentMode = mode;
    if (isRunning !== undefined) currentIsRunning = isRunning;

    if (currentMode === 'break') {
        document.body.classList.add('break-mode');
        startBtn.textContent = currentIsRunning ? 'Pause Break' : 'Resume Break';
        startBtn.style.background = currentIsRunning ? 'var(--ctp-red)' : 'var(--ctp-teal)';
    } else {
        document.body.classList.remove('break-mode');
        startBtn.textContent = currentIsRunning ? 'Pause Session' : 'Start Focus';
        startBtn.style.background = currentIsRunning ? 'var(--ctp-red)' : 'var(--ctp-green)';
    }
}

function syncTimeWithBackground() {
    chrome.runtime.sendMessage({ type: 'SET_TIME', time: timeLeft });
}

// Fetch initial status from background service worker
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response) {
        timeLeft = response.timeLeft;
        updateDisplay();
        applyModeAndRunning(response.mode, response.isRunning);
        if (response.completedSessions !== undefined) {
            completedDisplay.textContent = response.completedSessions;
        }
        if (response.sessionTarget !== undefined && sessionTargetInput) {
            sessionTargetInput.value = response.sessionTarget;
        }
    }
});

startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        if (response && response.isRunning) {
            chrome.runtime.sendMessage({ type: 'STOP_TIMER' });
        } else {
            chrome.runtime.sendMessage({ type: 'START_TIMER' });
        }
    });
});

incBtn.addEventListener('click', () => {
    if (!currentIsRunning && currentMode === 'focus') {
        timeLeft += 60;
        updateDisplay();
        syncTimeWithBackground();
    }
});

decBtn.addEventListener('click', () => {
    if (!currentIsRunning && currentMode === 'focus' && timeLeft >= 120) {
        timeLeft -= 60;
        updateDisplay();
        syncTimeWithBackground();
    }
});

restartBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'RESET_TIMER' });
});

if (sessionTargetInput) {
    sessionTargetInput.addEventListener('change', () => {
        const target = Math.max(1, parseInt(sessionTargetInput.value, 10) || 1);
        sessionTargetInput.value = target;
        chrome.runtime.sendMessage({ type: 'SET_SESSION_TARGET', target });
        chrome.storage.local.set({ sessionTarget: target });
    });
}

// Break / Work & Tick Listener
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TICK' || message.type === 'TIMER_FINISHED' || message.type === 'TIMER_RESET') {
        if (message.timeLeft !== undefined) {
            timeLeft = message.timeLeft;
            updateDisplay();
        }
        if (message.mode !== undefined || message.isRunning !== undefined) {
            applyModeAndRunning(message.mode, message.isRunning);
        }
        if (message.completedSessions !== undefined) {
            completedDisplay.textContent = message.completedSessions;
        }
        if (message.sessionTarget !== undefined && sessionTargetInput) {
            sessionTargetInput.value = message.sessionTarget;
        }
    } else if (message.type === 'ANALYTICS_UPDATE') {
        updateAnalyticsUI(message.analytics);
    } else if (message.type === 'AMBIENT_STATE_CHANGED') {
        isAmbientPlaying = message.isPlaying;
        if (message.soundscape) currentSoundscape = message.soundscape;
        if (message.volume !== undefined) currentAmbientVolume = message.volume;
        updateSoundscapeUI();
    }
});

// ============================================================================
// Media Player Logic
// ============================================================================
const playPauseBtn = document.getElementById('playPause');
const nextBtn = document.getElementById('next');
const prevBtn = document.getElementById('prev');

playPauseBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'MEDIA_COMMAND', action: 'playpause' });
});

nextBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'MEDIA_COMMAND', action: 'next' });
});

prevBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'MEDIA_COMMAND', action: 'prev' });
});

const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const mediaThumb = document.getElementById('mediaThumb');

function updateMediaUI() {
    chrome.runtime.sendMessage({ type: 'GET_MEDIA_INFO' }, (info) => {
        if (!info) return;
        trackTitle.textContent = info.title || 'No Media Detected';
        trackArtist.textContent = info.artist || 'Start playing music...';

        if (info.art) {
            mediaThumb.innerHTML = `<img src="${info.art}" alt="Album Art">`;
        } else {
            mediaThumb.innerHTML = `<span>🎵</span>`;
        }
    });
}
updateMediaUI();
setInterval(updateMediaUI, 2000);

// ============================================================================
// Ambient Soundscapes & Volume Controller
// ============================================================================
const soundscapeSelect = document.getElementById('soundscapeSelect');
const soundscapeToggle = document.getElementById('soundscapeToggle');
const soundscapeVolume = document.getElementById('soundscapeVolume');
const volumePercent = document.getElementById('volumePercent');

let isAmbientPlaying = false;
let currentSoundscape = 'lofi';
let currentAmbientVolume = 0.5;

function updateSoundscapeUI() {
    if (soundscapeToggle) {
        soundscapeToggle.textContent = isAmbientPlaying ? '⏸ Pause' : '▶ Play';
        soundscapeToggle.classList.toggle('playing', isAmbientPlaying);
    }
    if (soundscapeSelect) {
        soundscapeSelect.value = currentSoundscape;
    }
    if (soundscapeVolume) {
        soundscapeVolume.value = Math.round(currentAmbientVolume * 100);
    }
    if (volumePercent) {
        volumePercent.textContent = `${Math.round(currentAmbientVolume * 100)}%`;
    }
}

chrome.storage.local.get(['ambientPlaying', 'currentSoundscape', 'ambientVolume'], (res) => {
    isAmbientPlaying = !!res.ambientPlaying;
    currentSoundscape = res.currentSoundscape || 'lofi';
    currentAmbientVolume = res.ambientVolume !== undefined ? res.ambientVolume : 0.5;
    updateSoundscapeUI();
});

if (soundscapeToggle) {
    soundscapeToggle.addEventListener('click', () => {
        isAmbientPlaying = !isAmbientPlaying;
        if (isAmbientPlaying) {
            chrome.runtime.sendMessage({
                type: 'PLAY_SOUNDSCAPE',
                soundscape: currentSoundscape,
                volume: currentAmbientVolume
            });
        } else {
            chrome.runtime.sendMessage({ type: 'PAUSE_SOUNDSCAPE' });
        }
        chrome.storage.local.set({ ambientPlaying: isAmbientPlaying });
        updateSoundscapeUI();
    });
}

if (soundscapeSelect) {
    soundscapeSelect.addEventListener('change', (e) => {
        currentSoundscape = e.target.value;
        chrome.storage.local.set({ currentSoundscape });
        if (isAmbientPlaying) {
            chrome.runtime.sendMessage({
                type: 'PLAY_SOUNDSCAPE',
                soundscape: currentSoundscape,
                volume: currentAmbientVolume
            });
        }
    });
}

if (soundscapeVolume) {
    soundscapeVolume.addEventListener('input', (e) => {
        currentAmbientVolume = parseInt(e.target.value, 10) / 100;
        if (volumePercent) volumePercent.textContent = `${e.target.value}%`;
        chrome.runtime.sendMessage({
            type: 'SET_AMBIENT_VOLUME',
            volume: currentAmbientVolume
        });
        chrome.storage.local.set({ ambientVolume: currentAmbientVolume });
    });
}

// ============================================================================
// Focus Rules Settings & Toggles
// ============================================================================
const blockAllToggle = document.getElementById('blockAll');
const blockedSitesArea = document.getElementById('blockedSites');

function saveBlockSettings() {
    const sites = blockedSitesArea.value.split('\n');
    chrome.runtime.sendMessage({
        type: 'UPDATE_BLOCK_SETTINGS',
        blockAll: blockAllToggle.checked,
        blockedSites: sites
    });

    chrome.storage.local.set({
        blockAll: blockAllToggle.checked,
        blockedSites: blockedSitesArea.value
    });
}

if (blockAllToggle) blockAllToggle.addEventListener('change', saveBlockSettings);
if (blockedSitesArea) blockedSitesArea.addEventListener('input', saveBlockSettings);

chrome.storage.local.get(['blockAll', 'blockedSites'], (res) => {
    if (res.blockAll !== undefined && blockAllToggle) blockAllToggle.checked = res.blockAll;
    if (res.blockedSites !== undefined && blockedSitesArea) blockedSitesArea.value = res.blockedSites;
});

// Clean Article Reader Toggle
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
        } catch (err) {
            console.error('Cleanse trigger error:', err);
        }
    });

    chrome.storage.local.get(['cleanseActive'], (res) => {
        if (res.cleanseActive) removeJSToggle.checked = true;
    });
}

// Doomscroll Nudge Toggle
const doomscrollToggle = document.getElementById('doomscrollToggle');
if (doomscrollToggle) {
    chrome.storage.local.get(['doomscrollEnabled'], (res) => {
        doomscrollToggle.checked = res.doomscrollEnabled !== false;
    });
    doomscrollToggle.addEventListener('change', (e) => {
        chrome.storage.local.set({ doomscrollEnabled: e.target.checked });
    });
}

// Shorts Daily Allowance Setting
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

// Timer Completion Chime Toggle
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
// Focus Tasks & Goal Logic
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
        activeFocusText.textContent = activeTask.text;
        activeFocusText.title = activeTask.text;
        if (activeFocusContainer) activeFocusContainer.classList.add('has-focus');
        if (quickCompleteTaskBtn) quickCompleteTaskBtn.style.display = 'inline-block';
    } else {
        activeFocusText.textContent = tasks.length === 0 ? 'Add a task below to focus' : 'All tasks completed! 🎉';
        activeFocusText.title = '';
        if (activeFocusContainer) activeFocusContainer.classList.remove('has-focus');
        if (quickCompleteTaskBtn) quickCompleteTaskBtn.style.display = 'none';
    }
}

function renderTasks() {
    if (!todoList) return;
    todoList.innerHTML = '';

    const completedCount = tasks.filter(t => t.completed).length;
    const totalCount = tasks.length;
    if (todoBadge) todoBadge.textContent = `${completedCount}/${totalCount}`;

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

        // Pin / Star button
        const pinBtn = document.createElement('button');
        pinBtn.type = 'button';
        pinBtn.className = `todo-pin-btn ${task.isPinned && !task.completed ? 'pinned' : ''}`;
        pinBtn.title = task.isPinned ? 'Unpin focus goal' : 'Set as current focus goal';
        pinBtn.textContent = (task.isPinned && !task.completed) ? '★' : '☆';
        pinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePinTask(task.id);
        });

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'todo-checkbox';
        checkbox.checked = !!task.completed;
        checkbox.addEventListener('change', () => {
            toggleTask(task.id);
        });

        // Task text
        const textSpan = document.createElement('span');
        textSpan.className = 'todo-text';
        textSpan.textContent = task.text;

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'todo-delete-btn';
        delBtn.title = 'Delete task';
        delBtn.innerHTML = '&times;';
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
        if (activeTaskId === id) {
            activeTaskId = null;
        }
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
    if (activeTaskId === id) {
        activeTaskId = null;
    }
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
        if (activeTask) {
            toggleTask(activeTask.id);
        }
    });
}

// Initial load
loadTasks();

// Listen for storage updates in case tasks are updated from other contexts
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.tasks || changes.activeTaskId)) {
        if (changes.tasks) tasks = changes.tasks.newValue || [];
        if (changes.activeTaskId) activeTaskId = changes.activeTaskId.newValue || null;
        renderActiveFocus();
        renderTasks();
    }
});
