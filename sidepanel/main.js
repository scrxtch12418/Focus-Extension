// --- Pop-out Window Logic ---
const popOutBtn = document.getElementById('popOutBtn');

popOutBtn.addEventListener('click', () => {
    // Get the exact URL of your extension's index.html
    const extensionUrl = chrome.runtime.getURL('index.html');

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
const timerDisplay = document.getElementById('timer');
const incBtn = document.getElementById('incTime');
const decBtn = document.getElementById('decTime');
const startBtn = document.getElementById('startTimer');
const restartBtn = document.getElementById('restartTimer');
const completedDisplay = document.getElementById('completedSessions');

function updateDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function syncTimeWithBackground() {
    chrome.runtime.sendMessage({ type: 'SET_TIME', time: timeLeft });
}

chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response) {
        timeLeft = response.timeLeft;
        updateDisplay();
        if (response.isRunning) {
            startBtn.textContent = 'Pause Session';
            startBtn.style.background = 'var(--ctp-red)';
        }
    }
});

startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        if (response.isRunning) {
            chrome.runtime.sendMessage({ type: 'STOP_TIMER' });
            startBtn.textContent = document.body.classList.contains('break-mode') ? 'Resume Break' : 'Start Focus';
            startBtn.style.background = document.body.classList.contains('break-mode') ? 'var(--ctp-teal)' : 'var(--ctp-green)';
        } else {
            chrome.runtime.sendMessage({ type: 'START_TIMER' });
            startBtn.textContent = 'Pause Session';
            startBtn.style.background = 'var(--ctp-red)';
        }
    });
});

incBtn.addEventListener('click', () => {
    timeLeft += 60;
    updateDisplay();
    syncTimeWithBackground();
});

decBtn.addEventListener('click', () => {
    if (timeLeft >= 120) {
        timeLeft -= 60;
        updateDisplay();
        syncTimeWithBackground();
    }
});

restartBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_TIMER' });
    document.body.classList.remove('break-mode');
    timeLeft = 25 * 60;
    updateDisplay();
    syncTimeWithBackground();
    startBtn.textContent = 'Start Focus';
    startBtn.style.background = 'var(--ctp-green)';
});

// --- Break / Work Transitions ---
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TICK') {
        timeLeft = message.timeLeft;
        updateDisplay();
    }

    if (message.type === 'TIMER_FINISHED') {
        const isCurrentlyBreaking = document.body.classList.contains('break-mode');

        if (!isCurrentlyBreaking) {
            document.body.classList.add('break-mode');
            timeLeft = 5 * 60;
            updateDisplay();
            syncTimeWithBackground();
            chrome.runtime.sendMessage({ type: 'START_TIMER' });
            startBtn.textContent = 'Pause Break';
            startBtn.style.background = 'var(--ctp-red)';
        } else {
            document.body.classList.remove('break-mode');
            timeLeft = 25 * 60;
            updateDisplay();
            syncTimeWithBackground();
            startBtn.textContent = 'Start Focus';
            startBtn.style.background = 'var(--ctp-green)';
            completedDisplay.textContent = parseInt(completedDisplay.textContent) + 1;
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
        chrome.tabs.sendMessage(tab.id, {
            type: 'TRIGGER_CLEANSE',
            state: e.target.checked
        });
    }
});

chrome.storage.local.get(['cleanseActive'], (res) => {
    if (res.cleanseActive) removeJSToggle.checked = true;
});

// --- NEW: Lofi Logic ---
const lofiToggle = document.getElementById('lofiToggle');
lofiToggle.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_LOFI', state: e.target.checked });
    chrome.storage.local.set({ lofiPlaying: e.target.checked });
});

chrome.storage.local.get(['lofiPlaying'], (res) => {
    if (res.lofiPlaying) lofiToggle.checked = true;
});