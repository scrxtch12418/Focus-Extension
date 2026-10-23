// --- Pop-out Window Logic ---
const popOutBtn = document.getElementById('popOutBtn');

popOutBtn.addEventListener('click', () => {
    // Get the exact URL of your extension's sidepanel/index.html
    const extensionUrl = chrome.runtime.getURL('sidepanel/index.html');

    // Create a floating window that acts like a persistent side panel
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

// --- Pomodoro Logic ---
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
        const target = Math.max(1, parseInt(sessionTargetInput.value) || 1);
        sessionTargetInput.value = target;
        chrome.runtime.sendMessage({ type: 'SET_SESSION_TARGET', target });
        chrome.storage.local.set({ sessionTarget: target });
    });
}

// --- Break / Work & Tick Listener ---
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
    }
});

// --- Media Player Logic ---
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

// --- Media Info Fetcher ---
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

// --- Site Blocker Logic ---
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

blockAllToggle.addEventListener('change', saveBlockSettings);
blockedSitesArea.addEventListener('input', saveBlockSettings);

chrome.storage.local.get(['blockAll', 'blockedSites'], (res) => {
    if (res.blockAll !== undefined) blockAllToggle.checked = res.blockAll;
    if (res.blockedSites !== undefined) blockedSitesArea.value = res.blockedSites;
});

// --- Content Cleanser Logic ---
const removeJSToggle = document.getElementById('removeJS');

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

// --- Lofi Logic ---
const lofiToggle = document.getElementById('lofiToggle');
lofiToggle.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_LOFI', state: e.target.checked });
    chrome.storage.local.set({ lofiPlaying: e.target.checked });
});

chrome.storage.local.get(['lofiPlaying'], (res) => {
    if (res.lofiPlaying) lofiToggle.checked = true;
});