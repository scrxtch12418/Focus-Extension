const DEFAULT_FOCUS_TIME = 25 * 60;
const DEFAULT_BREAK_TIME = 5 * 60;

let timerInterval = null;
let timerState = {
    timeLeft: DEFAULT_FOCUS_TIME,
    isRunning: false,
    mode: 'focus', // 'focus' | 'break'
    targetEndTime: null,
    completedSessions: 0,
    sessionTarget: 4,
    focusDuration: DEFAULT_FOCUS_TIME,
    breakDuration: DEFAULT_BREAK_TIME
};

// Force Chrome to open the Side Panel when the icon is clicked
if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
}

// Restore timer state on service worker startup
async function loadTimerState() {
    try {
        const data = await chrome.storage.local.get(['timerState']);
        if (data.timerState) {
            timerState = { ...timerState, ...data.timerState };
            if (timerState.isRunning && timerState.targetEndTime) {
                const remaining = Math.max(0, Math.round((timerState.targetEndTime - Date.now()) / 1000));
                if (remaining <= 0) {
                    await handleTimerFinished();
                } else {
                    timerState.timeLeft = remaining;
                    startTickLoop();
                }
            }
        }
    } catch (e) {
        console.error('Error loading timer state:', e);
    }
}
loadTimerState();

async function saveTimerState() {
    try {
        await chrome.storage.local.set({ timerState });
    } catch (e) {
        console.error('Error saving timer state:', e);
    }
}

// Chrome Alarm Listener for persistent MV3 timer triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'focusTimer') {
        await handleTimerFinished();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_TIMER') {
        startTimer();
    } else if (message.type === 'STOP_TIMER') {
        stopTimer();
    } else if (message.type === 'RESET_TIMER') {
        resetTimer();
    } else if (message.type === 'GET_STATUS') {
        sendResponse(getCurrentStatus());
    } else if (message.type === 'SET_TIME') {
        if (!timerState.isRunning && timerState.mode === 'focus') {
            timerState.focusDuration = message.time;
            timerState.timeLeft = message.time;
            saveTimerState();
            broadcastStatus('TICK');
        }
    } else if (message.type === 'SET_SESSION_TARGET') {
        timerState.sessionTarget = Math.max(1, message.target || 1);
        saveTimerState();
    } else if (message.type === 'MEDIA_COMMAND') {
        executeMediaCommand(message.action);
    } else if (message.type === 'GET_MEDIA_INFO') {
        fetchMediaInfo().then(info => sendResponse(info));
        return true;
    } else if (message.type === 'UPDATE_BLOCK_SETTINGS') {
        updateBlockRules(message.blockAll, message.blockedSites);
    } else if (message.type === 'TOGGLE_LOFI') {
        setupOffscreenDocument().then(() => {
            chrome.runtime.sendMessage({
                target: 'offscreen',
                type: message.state ? 'PLAY_LOFI' : 'PAUSE_LOFI'
            }).catch(() => {});
        });
    }
});

function getCurrentStatus() {
    if (timerState.isRunning && timerState.targetEndTime) {
        timerState.timeLeft = Math.max(0, Math.round((timerState.targetEndTime - Date.now()) / 1000));
    }
    return {
        timeLeft: timerState.timeLeft,
        isRunning: timerState.isRunning,
        mode: timerState.mode,
        completedSessions: timerState.completedSessions,
        sessionTarget: timerState.sessionTarget
    };
}

async function startTimer() {
    if (!timerState.isRunning) {
        timerState.isRunning = true;
        timerState.targetEndTime = Date.now() + (timerState.timeLeft * 1000);
        chrome.alarms.create('focusTimer', { when: timerState.targetEndTime });
        await saveTimerState();
        startTickLoop();
        broadcastStatus('TICK');
    }
}

async function stopTimer() {
    if (timerState.isRunning) {
        if (timerState.targetEndTime) {
            timerState.timeLeft = Math.max(0, Math.round((timerState.targetEndTime - Date.now()) / 1000));
        }
        timerState.isRunning = false;
        timerState.targetEndTime = null;
        chrome.alarms.clear('focusTimer');
        stopTickLoop();
        await saveTimerState();
        broadcastStatus('TICK');
    }
}

async function resetTimer() {
    stopTickLoop();
    chrome.alarms.clear('focusTimer');
    timerState.isRunning = false;
    timerState.targetEndTime = null;
    timerState.mode = 'focus';
    timerState.timeLeft = timerState.focusDuration;
    await saveTimerState();
    broadcastStatus('TIMER_RESET');
}

async function handleTimerFinished() {
    stopTickLoop();
    chrome.alarms.clear('focusTimer');

    if (timerState.mode === 'focus') {
        timerState.completedSessions += 1;
        const reachedTarget = timerState.completedSessions >= timerState.sessionTarget;

        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-128.png',
            title: reachedTarget ? '🎯 Daily Goal Reached!' : '⏰ Focus Session Complete!',
            message: reachedTarget
                ? `Fantastic job! You completed all ${timerState.sessionTarget} focus sessions!`
                : `Great focus! Time for a 5-minute break. (Session ${timerState.completedSessions}/${timerState.sessionTarget})`
        });

        // Automatically switch to break mode and start break timer
        timerState.mode = 'break';
        timerState.timeLeft = timerState.breakDuration;
        timerState.isRunning = true;
        timerState.targetEndTime = Date.now() + (timerState.timeLeft * 1000);
        chrome.alarms.create('focusTimer', { when: timerState.targetEndTime });
        startTickLoop();
    } else {
        // Break mode finished
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-128.png',
            title: '☕ Break Over!',
            message: 'Ready to shift gears and dive back into focus?'
        });

        // Switch back to focus mode and wait for user start
        timerState.mode = 'focus';
        timerState.timeLeft = timerState.focusDuration;
        timerState.isRunning = false;
        timerState.targetEndTime = null;
    }

    await saveTimerState();
    broadcastStatus('TIMER_FINISHED');
}

function startTickLoop() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!timerState.isRunning || !timerState.targetEndTime) {
            stopTickLoop();
            return;
        }
        const remaining = Math.max(0, Math.round((timerState.targetEndTime - Date.now()) / 1000));
        timerState.timeLeft = remaining;
        if (remaining <= 0) {
            handleTimerFinished();
        } else {
            broadcastStatus('TICK');
        }
    }, 1000);
}

function stopTickLoop() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function broadcastStatus(type) {
    chrome.runtime.sendMessage({
        type,
        timeLeft: timerState.timeLeft,
        isRunning: timerState.isRunning,
        mode: timerState.mode,
        completedSessions: timerState.completedSessions,
        sessionTarget: timerState.sessionTarget
    }).catch(() => {
        // Suppress error if popup / side panel is not open
    });
}

async function executeMediaCommand(action) {
    try {
        let tabs = await chrome.tabs.query({ audible: true });

        if (tabs.length === 0) {
            tabs = await chrome.tabs.query({ url: ["*://*.youtube.com/*", "*://*.spotify.com/*"] });
        }

        if (tabs.length === 0 || !tabs[0].id) return;

        const targetTab = tabs[0];

        chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: (cmd) => {
                const host = window.location.hostname;

                if (host.includes('spotify.com')) {
                    if (cmd === 'playpause') document.querySelector('[data-testid="control-button-playpause"]')?.click();
                    if (cmd === 'next') document.querySelector('[data-testid="control-button-skip-forward"]')?.click();
                    if (cmd === 'prev') document.querySelector('[data-testid="control-button-skip-back"]')?.click();
                    return;
                }

                if (host.includes('youtube.com')) {
                    const videoElement = document.querySelector('video');
                    if (videoElement) {
                        if (cmd === 'playpause') videoElement.paused ? videoElement.play() : videoElement.pause();
                        else if (cmd === 'next') document.querySelector('.ytp-next-button')?.click();
                        else if (cmd === 'prev') document.querySelector('.ytp-prev-button')?.click();
                    }
                    return;
                }

                const mediaElement = document.querySelector('video, audio');
                if (mediaElement) {
                    if (cmd === 'playpause') {
                        mediaElement.paused ? mediaElement.play() : mediaElement.pause();
                    } else if (cmd === 'next') {
                        mediaElement.currentTime = mediaElement.duration;
                    } else if (cmd === 'prev') {
                        mediaElement.currentTime = 0;
                    }
                }
            },
            args: [action]
        }).catch(() => {});
    } catch (e) {
        console.error('Media command error:', e);
    }
}

async function fetchMediaInfo() {
    try {
        let tabs = await chrome.tabs.query({ audible: true });

        if (tabs.length === 0) {
            tabs = await chrome.tabs.query({ url: ["*://*.youtube.com/*", "*://*.spotify.com/*"] });
        }

        if (tabs.length === 0 || !tabs[0].id) {
            return { title: 'No Media Detected', artist: 'Start playing music...', art: '' };
        }

        const targetTab = tabs[0];

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: () => {
                if (navigator.mediaSession && navigator.mediaSession.metadata) {
                    const meta = navigator.mediaSession.metadata;
                    return {
                        title: meta.title || document.title,
                        artist: meta.artist || '',
                        art: meta.artwork && meta.artwork.length > 0 ? meta.artwork[meta.artwork.length - 1].src : ''
                    };
                }

                let art = '';
                if (window.location.hostname.includes('youtube.com')) {
                    const ytVideoId = new URLSearchParams(window.location.search).get('v');
                    if (ytVideoId) art = `https://i.ytimg.com/vi/${ytVideoId}/maxresdefault.jpg`;
                }

                const cleanTitle = document.title.replace(/^\(\d+\)\s+/, '');
                return {
                    title: cleanTitle,
                    artist: window.location.hostname.replace('www.', ''),
                    art: art
                };
            }
        });
        return result || { title: 'No Media Detected', artist: 'Start playing music...', art: '' };
    } catch (error) {
        return { title: 'No Media Detected', artist: 'Start playing music...', art: '' };
    }
}

async function updateBlockRules(isBlockingAll, blockedList) {
    try {
        const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
        const oldRuleIds = oldRules.map(rule => rule.id);

        let newRules = [];

        if (isBlockingAll) {
            newRules.push({
                id: 1,
                priority: 1,
                action: { type: 'block' },
                condition: { urlFilter: '*', resourceTypes: ['main_frame'] }
            });
        } else if (blockedList && blockedList.length > 0) {
            blockedList.forEach((site, index) => {
                if (site.trim().length > 0) {
                    newRules.push({
                        id: index + 2,
                        priority: 1,
                        action: { type: 'block' },
                        condition: {
                            urlFilter: site.trim(),
                            resourceTypes: ['main_frame']
                        }
                    });
                }
            });
        }

        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: oldRuleIds,
            addRules: newRules
        });
    } catch (e) {
        console.error('Error updating block rules:', e);
    }
}

// --- Lofi Offscreen Setup ---
async function setupOffscreenDocument() {
    try {
        const existingContexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
        if (existingContexts.length > 0) return;

        await chrome.offscreen.createDocument({
            url: 'sidepanel/offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Playing Lofi radio for focus mode'
        });
    } catch (e) {
        console.error('Error setting up offscreen document:', e);
    }
}