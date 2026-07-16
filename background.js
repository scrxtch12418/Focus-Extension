let timerInterval = null;
let timeLeft = 25 * 60;
let isRunning = false;

// Force Chrome to open the Side Panel when the icon is clicked
if (chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_TIMER') {
        startTimer();
    } else if (message.type === 'STOP_TIMER') {
        stopTimer();
    } else if (message.type === 'GET_STATUS') {
        sendResponse({ timeLeft, isRunning });
    } else if (message.type === 'SET_TIME') {
        if (!isRunning) {
            timeLeft = message.time;
        }
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
            });
        });
    }
});

function startTimer() {
    if (!isRunning) {
        isRunning = true;
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                chrome.runtime.sendMessage({ type: 'TICK', timeLeft });
            } else {
                stopTimer();
                chrome.runtime.sendMessage({ type: 'TIMER_FINISHED' });
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon-128.png',
                    title: 'Time is up!',
                    message: 'Time to shift gears.'
                });
            }
        }, 1000);
    }
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning = false;
}

async function executeMediaCommand(action) {
    let tabs = await chrome.tabs.query({ audible: true });

    if (tabs.length === 0) {
        tabs = await chrome.tabs.query({ url: ["*://*.youtube.com/*", "*://*.spotify.com/*"] });
    }

    if (tabs.length === 0) return;

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
    });
}

async function fetchMediaInfo() {
    let tabs = await chrome.tabs.query({ audible: true });

    if (tabs.length === 0) {
        tabs = await chrome.tabs.query({ url: ["*://*.youtube.com/*", "*://*.spotify.com/*"] });
    }

    if (tabs.length === 0) {
        return { title: 'No Media Detected', artist: 'Start playing music...', art: '' };
    }

    const targetTab = tabs[0];

    try {
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
        return result;
    } catch (error) {
        return { title: 'No Media Detected', artist: 'Start playing music...', art: '' };
    }
}

async function updateBlockRules(isBlockingAll, blockedList) {
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
    } else if (blockedList.length > 0) {
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
}

// ---Lofi Offscreen Setup ---
async function setupOffscreenDocument() {
    const existingContexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
    if (existingContexts.length > 0) return;

    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Playing Lofi radio for focus mode'
    });
}