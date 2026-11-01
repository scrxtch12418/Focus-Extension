const DEFAULT_FOCUS_TIME = 25 * 60;
const DEFAULT_BREAK_TIME = 5 * 60;

const SOUNDSCAPE_LIST = ['lofi', 'rain', 'noise', 'ocean', 'cafe', 'binaural'];
const SOUNDSCAPE_TITLES = {
    'lofi': 'Lofi Chill Radio',
    'rain': 'Rain & Thunder Storm',
    'noise': 'Deep Brown Noise',
    'ocean': 'Ocean Waves',
    'cafe': 'Cozy Café Ambience',
    'binaural': '40Hz Gamma Focus'
};

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
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
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

// ============================================================================
// Daily Analytics & Streak Engine
// ============================================================================
function getTodayDateStr() {
    return new Date().toISOString().split('T')[0];
}

async function getAnalytics() {
    const today = getTodayDateStr();
    const res = await chrome.storage.local.get(['analytics']);
    let analytics = res.analytics || {
        lastActiveDate: today,
        streak: 0,
        todayFocusSeconds: 0,
        todaySessions: 0,
        todayShortsIntercepted: 0,
        history: {}
    };

    if (analytics.lastActiveDate !== today) {
        const lastDate = new Date(analytics.lastActiveDate);
        const currDate = new Date(today);
        const diffDays = Math.round((currDate - lastDate) / (1000 * 60 * 60 * 24));

        analytics.history = analytics.history || {};
        analytics.history[analytics.lastActiveDate] = {
            focusSeconds: analytics.todayFocusSeconds || 0,
            sessions: analytics.todaySessions || 0,
            shortsIntercepted: analytics.todayShortsIntercepted || 0
        };

        if (diffDays > 1) {
            analytics.streak = 0;
        }

        analytics.todayFocusSeconds = 0;
        analytics.todaySessions = 0;
        analytics.todayShortsIntercepted = 0;
        analytics.lastActiveDate = today;

        await chrome.storage.local.set({ analytics });
    }

    return analytics;
}

async function recordCompletedSession(durationSeconds) {
    const analytics = await getAnalytics();
    analytics.todaySessions = (analytics.todaySessions || 0) + 1;
    analytics.todayFocusSeconds = (analytics.todayFocusSeconds || 0) + (durationSeconds || 1500);

    if (analytics.streak === 0) {
        analytics.streak = 1;
    } else {
        analytics.streak = Math.max(1, analytics.streak);
    }

    await chrome.storage.local.set({ analytics });
    broadcastAnalytics();
}

async function recordShortsInterception() {
    const analytics = await getAnalytics();
    analytics.todayShortsIntercepted = (analytics.todayShortsIntercepted || 0) + 1;
    await chrome.storage.local.set({ analytics });
    broadcastAnalytics();
}

function broadcastAnalytics() {
    getAnalytics().then(analytics => {
        chrome.runtime.sendMessage({
            type: 'ANALYTICS_UPDATE',
            analytics
        }).catch(() => {});
    });
}

// Chrome Alarm Listener for persistent MV3 timer triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'focusTimer') {
        await handleTimerFinished();
    }
});

// Global Keyboard Shortcuts
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle_timer') {
        if (timerState.isRunning) {
            await stopTimer();
        } else {
            await startTimer();
        }
    } else if (command === 'toggle_audio') {
        await toggleAmbientAudio();
    } else if (command === 'clean_article') {
        await toggleActiveTabCleanse();
    }
});

async function toggleAmbientAudio() {
    const res = await chrome.storage.local.get(['ambientPlaying', 'currentSoundscape', 'ambientVolume']);
    const willPlay = !res.ambientPlaying;
    const soundscape = res.currentSoundscape || 'lofi';
    const volume = res.ambientVolume !== undefined ? res.ambientVolume : 0.5;

    await setupOffscreenDocument();
    chrome.runtime.sendMessage({
        target: 'offscreen',
        type: willPlay ? 'PLAY_SOUNDSCAPE' : 'PAUSE_SOUNDSCAPE',
        soundscape,
        volume
    }, () => {
        if (chrome.runtime.lastError) {}
    });

    await chrome.storage.local.set({ ambientPlaying: willPlay });
    broadcastAmbientState(willPlay, soundscape, volume);
}

function broadcastAmbientState(isPlaying, soundscape, volume) {
    chrome.runtime.sendMessage({
        type: 'AMBIENT_STATE_CHANGED',
        isPlaying,
        soundscape,
        volume
    }).catch(() => {});
}

async function toggleActiveTabCleanse() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            const res = await chrome.storage.local.get(['cleanseActive']);
            const nextState = !res.cleanseActive;
            await chrome.storage.local.set({ cleanseActive: nextState });
            chrome.tabs.sendMessage(tab.id, {
                type: 'TRIGGER_CLEANSE',
                state: nextState
            }).catch(() => {});
        }
    } catch (e) {
        console.error('Hotkey cleanse error:', e);
    }
}

async function handleBuiltinMediaCommand(action) {
    const res = await chrome.storage.local.get(['ambientPlaying', 'currentSoundscape', 'ambientVolume']);
    let isPlaying = !!res.ambientPlaying;
    let currentSoundscape = res.currentSoundscape || 'lofi';
    let volume = res.ambientVolume !== undefined ? res.ambientVolume : 0.5;

    if (action === 'playpause') {
        isPlaying = !isPlaying;
        await setupOffscreenDocument();
        chrome.runtime.sendMessage({
            target: 'offscreen',
            type: isPlaying ? 'PLAY_SOUNDSCAPE' : 'PAUSE_SOUNDSCAPE',
            soundscape: currentSoundscape,
            volume
        }, () => {
            if (chrome.runtime.lastError) {}
        });
        await chrome.storage.local.set({ ambientPlaying: isPlaying });
        broadcastAmbientState(isPlaying, currentSoundscape, volume);
    } else if (action === 'next' || action === 'prev') {
        const idx = SOUNDSCAPE_LIST.indexOf(currentSoundscape);
        let nextIdx = 0;
        if (action === 'next') {
            nextIdx = (idx + 1) % SOUNDSCAPE_LIST.length;
        } else {
            nextIdx = (idx - 1 + SOUNDSCAPE_LIST.length) % SOUNDSCAPE_LIST.length;
        }
        currentSoundscape = SOUNDSCAPE_LIST[nextIdx];
        await setupOffscreenDocument();
        if (isPlaying) {
            chrome.runtime.sendMessage({
                target: 'offscreen',
                type: 'PLAY_SOUNDSCAPE',
                soundscape: currentSoundscape,
                volume
            }, () => {
                if (chrome.runtime.lastError) {}
            });
        }
        await chrome.storage.local.set({ currentSoundscape });
        broadcastAmbientState(isPlaying, currentSoundscape, volume);
    }
}

// Runtime message dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_TIMER') {
        startTimer();
        sendResponse({ success: true });
        return false;
    } else if (message.type === 'STOP_TIMER') {
        stopTimer();
        sendResponse({ success: true });
        return false;
    } else if (message.type === 'RESET_TIMER') {
        resetTimer();
        sendResponse({ success: true });
        return false;
    } else if (message.type === 'GET_STATUS') {
        sendResponse(getCurrentStatus());
        return false;
    } else if (message.type === 'GET_ANALYTICS') {
        getAnalytics().then(analytics => {
            sendResponse(analytics);
        }).catch(() => {
            sendResponse(null);
        });
        return true;
    } else if (message.type === 'RECORD_INTERCEPTION') {
        recordShortsInterception();
        sendResponse({ success: true });
        return false;
    } else if (message.type === 'SET_TIME') {
        if (!timerState.isRunning && timerState.mode === 'focus') {
            timerState.focusDuration = message.time;
            timerState.timeLeft = message.time;
            saveTimerState();
            broadcastStatus('TICK');
        }
        sendResponse({ success: true });
        return false;
    } else if (message.type === 'SET_SESSION_TARGET') {
        timerState.sessionTarget = Math.max(1, message.target || 1);
        saveTimerState();
        sendResponse({ success: true });
        return false;
    } else if (message.type === 'MEDIA_COMMAND') {
        executeMediaCommand(message.action).then(() => {
            sendResponse({ success: true });
        }).catch(() => {
            sendResponse({ success: false });
        });
        return true;
    } else if (message.type === 'SEEK_MEDIA') {
        seekMedia(message.time).then(() => {
            sendResponse({ success: true });
        }).catch(() => {
            sendResponse({ success: false });
        });
        return true;
    } else if (message.type === 'TOGGLE_AMBIENT') {
        toggleAmbientAudio().then(() => {
            sendResponse({ success: true });
        }).catch(() => {
            sendResponse({ success: false });
        });
        return true;
    } else if (message.type === 'GET_MEDIA_INFO') {
        fetchMediaInfo().then(info => {
            sendResponse(info);
        }).catch(() => {
            sendResponse({ title: 'Lofi Focus Radio', artist: 'Focus Center', isBuiltin: true });
        });
        return true;
    } else if (message.type === 'UPDATE_BLOCK_SETTINGS') {
        updateBlockRules(message.blockAll, message.blockedSites).then(() => {
            sendResponse({ success: true });
        }).catch(() => {
            sendResponse({ success: false });
        });
        return true;
    } else if (message.type === 'PLAY_SOUNDSCAPE') {
        setupOffscreenDocument().then(() => {
            chrome.runtime.sendMessage({
                target: 'offscreen',
                type: 'PLAY_SOUNDSCAPE',
                soundscape: message.soundscape,
                volume: message.volume
            }, () => {
                if (chrome.runtime.lastError) {}
            });
            sendResponse({ success: true });
        }).catch(() => {
            sendResponse({ success: false });
        });
        return true;
    } else if (message.type === 'PAUSE_SOUNDSCAPE') {
        setupOffscreenDocument().then(() => {
            chrome.runtime.sendMessage({
                target: 'offscreen',
                type: 'PAUSE_SOUNDSCAPE'
            }, () => {
                if (chrome.runtime.lastError) {}
            });
            sendResponse({ success: true });
        }).catch(() => {
            sendResponse({ success: false });
        });
        return true;
    } else if (message.type === 'SET_AMBIENT_VOLUME') {
        setupOffscreenDocument().then(() => {
            chrome.runtime.sendMessage({
                target: 'offscreen',
                type: 'SET_AMBIENT_VOLUME',
                volume: message.volume
            }, () => {
                if (chrome.runtime.lastError) {}
            });
            sendResponse({ success: true });
        }).catch(() => {
            sendResponse({ success: false });
        });
        return true;
    }
    return false;
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
            title: reachedTarget ? 'Daily Goal Reached!' : 'Focus Session Complete!',
            message: reachedTarget
                ? `Fantastic job! You completed all ${timerState.sessionTarget} focus sessions!`
                : `Great focus! Time for a 5-minute break. (Session ${timerState.completedSessions}/${timerState.sessionTarget})`
        });

        await recordCompletedSession(timerState.focusDuration);

        const chimeData = await chrome.storage.local.get(['timerChimeEnabled']);
        if (chimeData.timerChimeEnabled !== false) {
            setupOffscreenDocument().then(() => {
                chrome.runtime.sendMessage({
                    target: 'offscreen',
                    type: 'PLAY_CHIME',
                    mode: 'focus'
                }, () => {
                    if (chrome.runtime.lastError) {}
                });
            });
        }

        timerState.mode = 'break';
        timerState.timeLeft = timerState.breakDuration;
        timerState.isRunning = true;
        timerState.targetEndTime = Date.now() + (timerState.timeLeft * 1000);
        chrome.alarms.create('focusTimer', { when: timerState.targetEndTime });
        startTickLoop();
    } else {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon-128.png',
            title: 'Break Over!',
            message: 'Ready to shift gears and dive back into focus?'
        });

        const chimeData = await chrome.storage.local.get(['timerChimeEnabled']);
        if (chimeData.timerChimeEnabled !== false) {
            setupOffscreenDocument().then(() => {
                chrome.runtime.sendMessage({
                    target: 'offscreen',
                    type: 'PLAY_CHIME',
                    mode: 'break'
                }, () => {
                    if (chrome.runtime.lastError) {}
                });
            });
        }

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
    }).catch(() => {});
}

async function executeMediaCommand(action) {
    try {
        let tabs = await chrome.tabs.query({ audible: true });

        if (tabs.length === 0) {
            tabs = await chrome.tabs.query({ url: ["*://*.youtube.com/*", "*://*.spotify.com/*"] });
        }

        // If no active external media tabs, control built-in soundscape player!
        if (tabs.length === 0 || !tabs[0].id) {
            await handleBuiltinMediaCommand(action);
            return;
        }

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

async function seekMedia(time) {
    try {
        let tabs = await chrome.tabs.query({ audible: true });
        if (tabs.length === 0) {
            tabs = await chrome.tabs.query({ url: ["*://*.youtube.com/*", "*://*.spotify.com/*"] });
        }
        if (tabs.length > 0 && tabs[0].id) {
            await chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (targetSec) => {
                    const video = document.querySelector('video');
                    if (video && !isNaN(targetSec)) {
                        video.currentTime = targetSec;
                    }
                },
                args: [time]
            });
        }
    } catch (e) {
        console.error('Seek error:', e);
    }
}

async function fetchMediaInfo() {
    try {
        let tabs = await chrome.tabs.query({ audible: true });

        if (tabs.length === 0) {
            tabs = await chrome.tabs.query({ url: ["*://*.youtube.com/*", "*://*.spotify.com/*"] });
        }

        if (tabs.length === 0 || !tabs[0].id) {
            return {
                title: 'No Active Tab Media',
                artist: 'Play a YouTube video or Spotify track',
                art: '',
                currentTime: 0,
                duration: 0,
                isPlaying: false,
                isExternal: false
            };
        }

        const targetTab = tabs[0];

        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: targetTab.id },
            func: () => {
                const video = document.querySelector('video');
                const currentTime = video ? Math.floor(video.currentTime || 0) : 0;
                const duration = video ? Math.floor(video.duration || 0) : 0;
                const isPlaying = video ? !video.paused : false;

                let title = document.title.replace(/^\(\d+\)\s+/, '');
                let artist = window.location.hostname.replace('www.', '');
                let art = '';

                if (navigator.mediaSession && navigator.mediaSession.metadata) {
                    const meta = navigator.mediaSession.metadata;
                    if (meta.title) title = meta.title;
                    if (meta.artist) artist = meta.artist;
                    if (meta.artwork && meta.artwork.length > 0) {
                        art = meta.artwork[meta.artwork.length - 1].src;
                    }
                }

                if (!art && window.location.hostname.includes('youtube.com')) {
                    const ytVideoId = new URLSearchParams(window.location.search).get('v');
                    if (ytVideoId) art = `https://i.ytimg.com/vi/${ytVideoId}/hqdefault.jpg`;
                }

                if (!art && window.location.hostname.includes('spotify.com')) {
                    const spotifyArt = document.querySelector('[data-testid="cover-art-image"]');
                    if (spotifyArt && spotifyArt.src) art = spotifyArt.src;
                }

                return {
                    title,
                    artist,
                    art,
                    currentTime,
                    duration,
                    isPlaying,
                    isExternal: true
                };
            }
        });
        return result || { title: 'No Media Playing', artist: 'Open YouTube or Spotify', art: '', currentTime: 0, duration: 0, isPlaying: false, isExternal: false };
    } catch (error) {
        return { title: 'No Media Playing', artist: 'Open YouTube or Spotify', art: '', currentTime: 0, duration: 0, isPlaying: false, isExternal: false };
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

// --- Audio Offscreen Setup with warm-up handshake ---
async function setupOffscreenDocument() {
    try {
        const existingContexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
        if (existingContexts.length > 0) return;

        await chrome.offscreen.createDocument({
            url: 'sidepanel/offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Playing ambient soundscapes and meditation chimes for focus'
        });
        await new Promise(resolve => setTimeout(resolve, 150));
    } catch (e) {
        console.error('Error setting up offscreen document:', e);
    }
}
