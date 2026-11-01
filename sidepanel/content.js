chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TRIGGER_CLEANSE') {
        if (message.state) {
            activateZenReader();
        } else {
            window.location.reload();
        }
    }
    if (typeof sendResponse === 'function') {
        sendResponse({ received: true });
    }
    return false;
});

function activateZenReader() {
    const junkSelectors = [
        'aside', 'footer', 'nav', 'header', '.ad', '.ads', '.advertisement',
        '[class*="banner"]', '[id*="ad-"]', 'iframe', '.social-share', '#comments'
    ];

    junkSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
    });

    document.querySelectorAll('script').forEach(s => s.remove());

    const mainContent = document.querySelector('article, main, [role="main"]') || document.body;

    document.body.innerHTML = '';
    document.body.appendChild(mainContent);

    const style = document.createElement('style');
    style.textContent = `
        body {
            background-color: #1e1e2e !important;
            color: #cdd6f4 !important;
            font-family: 'Georgia', serif !important;
            line-height: 1.8 !important;
            font-size: 18px !important;
            margin: 0 !important;
            padding: 5% 15% !important;
            transition: all 0.5s ease;
        }
        a { color: #89b4fa !important; text-decoration: none !important; }
        img { max-width: 100% !important; border-radius: 12px; margin: 20px 0; }
        h1, h2, h3 { color: #cba6f7 !important; font-family: monospace !important; }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// Anti-Doomscroll Intervention & Daily Budget for Shorts & Reels
// ============================================================================
(function initAntiDoomscroll() {
    const hostname = window.location.hostname;
    const isYouTube = hostname.includes('youtube.com');
    const isInstagram = hostname.includes('instagram.com');

    if (!isYouTube && !isInstagram) return;

    let doomscrollEnabled = true;
    let snoozeUntil = 0;
    let cachedTasks = [];
    let cachedActiveTaskId = null;
    let cachedTimerState = null;

    let shortsBudgetMinutes = 15;
    let shortsWatchedSeconds = 0;
    let budgetPillHost = null;

    let currentVideoKey = null;
    let lastAlertedVideoKey = null;
    let sessionScrollCount = 0;
    let overlayHost = null;

    function getTodayStr() {
        return new Date().toISOString().split('T')[0];
    }

    // Lucide Icon inline SVG generator for content script
    function svgIcon(name, size = 18, color = 'currentColor') {
        const icons = {
            'shield-alert': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>',
            'flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>',
            'clock': '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
            'target': '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>',
            'sparkles': '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>',
            'coffee': '<path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="4"></line><line x1="10" y1="2" x2="10" y2="4"></line><line x1="14" y1="2" x2="14" y2="4"></line>',
            'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>'
        };
        return `<svg style="display:inline-block;vertical-align:middle;" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icons[name] || ''}</svg>`;
    }

    chrome.storage.local.get(
        ['doomscrollEnabled', 'doomscrollSnoozeUntil', 'tasks', 'activeTaskId', 'timerState', 'shortsBudgetMinutes', 'shortsWatchedDaily'],
        (res) => {
            if (res.doomscrollEnabled !== undefined) doomscrollEnabled = res.doomscrollEnabled;
            if (res.doomscrollSnoozeUntil) snoozeUntil = res.doomscrollSnoozeUntil;
            if (res.tasks) cachedTasks = res.tasks;
            if (res.activeTaskId) cachedActiveTaskId = res.activeTaskId;
            if (res.timerState) cachedTimerState = res.timerState;
            if (res.shortsBudgetMinutes !== undefined) shortsBudgetMinutes = res.shortsBudgetMinutes;

            const today = getTodayStr();
            if (res.shortsWatchedDaily && res.shortsWatchedDaily.date === today) {
                shortsWatchedSeconds = res.shortsWatchedDaily.seconds || 0;
            } else {
                shortsWatchedSeconds = 0;
                chrome.storage.local.set({ shortsWatchedDaily: { date: today, seconds: 0 } });
            }

            checkLocationAndNudge();
        }
    );

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (changes.doomscrollEnabled) doomscrollEnabled = changes.doomscrollEnabled.newValue;
        if (changes.doomscrollSnoozeUntil) snoozeUntil = changes.doomscrollSnoozeUntil.newValue || 0;
        if (changes.tasks) cachedTasks = changes.tasks.newValue || [];
        if (changes.activeTaskId) cachedActiveTaskId = changes.activeTaskId.newValue || null;
        if (changes.timerState) cachedTimerState = changes.timerState.newValue || null;
        if (changes.shortsBudgetMinutes) {
            shortsBudgetMinutes = changes.shortsBudgetMinutes.newValue;
            updateBudgetPill();
        }
    });

    function getPlatformShortsInfo() {
        const path = window.location.pathname;
        if (isYouTube && path.startsWith('/shorts/')) {
            const id = path.split('/shorts/')[1]?.split(/[?#/]/)[0] || 'active_short';
            return { isShorts: true, platform: 'YouTube Shorts', id };
        }
        if (isInstagram && (path.startsWith('/reels/') || path.startsWith('/reel/'))) {
            const parts = path.split('/').filter(Boolean);
            const id = parts[1] || 'active_reel';
            return { isShorts: true, platform: 'Instagram Reels', id };
        }
        return { isShorts: false, platform: null, id: null };
    }

    function checkLocationAndNudge() {
        const info = getPlatformShortsInfo();

        if (!info.isShorts) {
            removeOverlay();
            removeBudgetPill();
            currentVideoKey = null;
            return;
        }

        if (!doomscrollEnabled) {
            removeOverlay();
            removeBudgetPill();
            return;
        }

        renderBudgetPill();

        if (shortsBudgetMinutes !== -1) {
            const maxSeconds = shortsBudgetMinutes * 60;
            if (shortsWatchedSeconds >= maxSeconds) {
                showBudgetExceededModal(info.platform);
                return;
            }
        }

        if (Date.now() < snoozeUntil) {
            removeOverlay();
            return;
        }

        currentVideoKey = `${info.platform}_${info.id}`;

        if (currentVideoKey !== lastAlertedVideoKey) {
            sessionScrollCount++;
            lastAlertedVideoKey = currentVideoKey;
            chrome.runtime.sendMessage({ type: 'RECORD_INTERCEPTION' }, () => {
                const _ = chrome.runtime.lastError;
            });
            showMindfulOverlay(info.platform);
        }
    }

    setInterval(() => {
        const info = getPlatformShortsInfo();
        if (!info.isShorts || !doomscrollEnabled) return;
        if (overlayHost) return;

        const isPlaying = Array.from(document.querySelectorAll('video')).some(v => !v.paused && v.currentTime > 0);
        if (isPlaying && document.hasFocus()) {
            shortsWatchedSeconds++;
            updateBudgetPill();

            if (shortsWatchedSeconds % 5 === 0) {
                const today = getTodayStr();
                chrome.storage.local.set({
                    shortsWatchedDaily: { date: today, seconds: shortsWatchedSeconds }
                });
            }

            if (shortsBudgetMinutes !== -1 && shortsWatchedSeconds >= shortsBudgetMinutes * 60) {
                showBudgetExceededModal(info.platform);
            }
        }
    }, 1000);

    function renderBudgetPill() {
        if (!budgetPillHost) {
            budgetPillHost = document.createElement('div');
            budgetPillHost.id = 'focus-budget-pill-host';
            budgetPillHost.style.cssText = 'all: initial; position: fixed; top: 18px; right: 24px; z-index: 2147483640;';
            document.documentElement.appendChild(budgetPillHost);
        }
        updateBudgetPill();
    }

    function updateBudgetPill() {
        if (!budgetPillHost) return;
        const shadow = budgetPillHost.shadowRoot || budgetPillHost.attachShadow({ mode: 'open' });

        let timeText = 'Unlimited';
        let isLow = false;

        if (shortsBudgetMinutes === 0) {
            timeText = 'Strict (0m)';
            isLow = true;
        } else if (shortsBudgetMinutes !== -1) {
            const remaining = Math.max(0, (shortsBudgetMinutes * 60) - shortsWatchedSeconds);
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            timeText = `${m}m ${s.toString().padStart(2, '0')}s left`;
            if (remaining < 180) isLow = true;
        }

        shadow.innerHTML = `
            <style>
                .pill {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: rgba(24, 24, 37, 0.9);
                    color: ${isLow ? '#f38ba8' : '#a6e3a1'};
                    border: 1px solid ${isLow ? 'rgba(243, 139, 168, 0.5)' : 'rgba(166, 227, 161, 0.4)'};
                    backdrop-filter: blur(8px);
                    padding: 6px 14px;
                    border-radius: 9999px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                    pointer-events: none;
                }
            </style>
            <div class="pill">
                ${svgIcon('clock', 15, isLow ? '#f38ba8' : '#a6e3a1')}
                <span>Shorts Budget: <strong>${timeText}</strong></span>
            </div>
        `;
    }

    function removeBudgetPill() {
        if (budgetPillHost && budgetPillHost.parentNode) {
            budgetPillHost.parentNode.removeChild(budgetPillHost);
            budgetPillHost = null;
        }
    }

    function pausePageVideos() {
        try {
            document.querySelectorAll('video').forEach((v) => {
                if (!v.paused) v.pause();
            });
        } catch (e) {}
    }

    function resumePageVideos() {
        try {
            document.querySelectorAll('video').forEach((v) => {
                v.play().catch(() => {});
            });
        } catch (e) {}
    }

    function getActiveTask() {
        if (cachedActiveTaskId) {
            const found = cachedTasks.find((t) => t.id === cachedActiveTaskId && !t.completed);
            if (found) return found;
        }
        return cachedTasks.find((t) => t.isPinned && !t.completed) || cachedTasks.find((t) => !t.completed) || null;
    }

    function formatTimerRemaining() {
        if (!cachedTimerState || !cachedTimerState.isRunning || !cachedTimerState.targetEndTime) {
            return null;
        }
        const remaining = Math.max(0, Math.round((cachedTimerState.targetEndTime - Date.now()) / 1000));
        if (remaining <= 0) return null;
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function showBudgetExceededModal(platform) {
        pausePageVideos();

        if (!overlayHost) {
            overlayHost = document.createElement('div');
            overlayHost.id = 'focus-anti-doomscroll-host';
            overlayHost.style.cssText = 'all: initial; position: absolute; z-index: 2147483647;';
            document.documentElement.appendChild(overlayHost);
        }

        const shadow = overlayHost.shadowRoot || overlayHost.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
            <style>
                * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                .backdrop {
                    position: fixed; inset: 0; width: 100vw; height: 100vh;
                    background: rgba(17, 17, 27, 0.88); backdrop-filter: blur(16px);
                    display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 2147483647;
                }
                .modal {
                    background: linear-gradient(145deg, #1e1e2e, #181825);
                    border: 2px solid rgba(243, 139, 168, 0.6);
                    border-radius: 20px; width: 100%; max-width: 440px; padding: 30px 24px;
                    color: #cdd6f4; text-align: center; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
                }
                .badge-icon { margin-bottom: 12px; display: inline-flex; color: #f38ba8; }
                h2 { margin: 0 0 8px 0; font-size: 1.5rem; font-weight: 800; color: #f38ba8; }
                p.sub { margin: 0 0 20px 0; font-size: 0.95rem; color: #a6adc8; line-height: 1.4; }
                .btn {
                    border: none; border-radius: 12px; padding: 14px 18px; font-size: 0.92rem; font-weight: 700;
                    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
                }
                .btn-primary { background: #a6e3a1; color: #11111b; margin-bottom: 10px; }
                .btn-secondary { background: rgba(49, 50, 68, 0.8); color: #cdd6f4; border: 1px solid rgba(255, 255, 255, 0.12); }
            </style>
            <div class="backdrop">
                <div class="modal">
                    <div class="badge-icon">${svgIcon('shield-alert', 48, '#f38ba8')}</div>
                    <h2>Daily Allowance Reached!</h2>
                    <p class="sub">You have used up all <strong>${shortsBudgetMinutes} minutes</strong> of your daily Shorts & Reels allowance. Step away and protect your focus!</p>
                    <button class="btn btn-primary" id="btnExitNow">${svgIcon('arrow-right', 16, '#11111b')} Leave ${platform} Now</button>
                    <button class="btn btn-secondary" id="btnEmergency2m">+2m Emergency Extension</button>
                </div>
            </div>
        `;

        shadow.getElementById('btnExitNow').addEventListener('click', () => {
            removeOverlay();
            if (isYouTube) window.location.href = 'https://www.youtube.com/';
            else if (isInstagram) window.location.href = 'https://www.instagram.com/';
        });

        shadow.getElementById('btnEmergency2m').addEventListener('click', () => {
            shortsWatchedSeconds = Math.max(0, (shortsBudgetMinutes * 60) - 120);
            removeOverlay();
            updateBudgetPill();
            resumePageVideos();
        });
    }

    function showMindfulOverlay(platform) {
        pausePageVideos();

        if (!overlayHost) {
            overlayHost = document.createElement('div');
            overlayHost.id = 'focus-anti-doomscroll-host';
            overlayHost.style.cssText = 'all: initial; position: absolute; z-index: 2147483647;';
            document.documentElement.appendChild(overlayHost);
        }

        const activeTask = getActiveTask();
        const timerRemaining = formatTimerRemaining();

        const shadow = overlayHost.shadowRoot || overlayHost.attachShadow({ mode: 'open' });
        shadow.innerHTML = `
            <style>
                * {
                    box-sizing: border-box;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                }
                .backdrop {
                    position: fixed; inset: 0; width: 100vw; height: 100vh;
                    background: rgba(17, 17, 27, 0.78); backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center;
                    padding: 20px; z-index: 2147483647; animation: fadeIn 0.25s ease-out;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleUp { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 20px rgba(203, 166, 247, 0.2); }
                    50% { box-shadow: 0 0 35px rgba(203, 166, 247, 0.45); }
                }
                .modal {
                    background: linear-gradient(145deg, #1e1e2e, #181825);
                    border: 1px solid rgba(203, 166, 247, 0.35); border-radius: 20px;
                    width: 100%; max-width: 440px; padding: 28px 24px; color: #cdd6f4;
                    text-align: center; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
                    animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1), pulseGlow 4s infinite ease-in-out;
                }
                .badge-icon { margin-bottom: 12px; display: inline-flex; color: #f38ba8; }
                h2 { margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 800; color: #cba6f7; letter-spacing: -0.3px; }
                p.sub { margin: 0 0 16px 0; font-size: 0.95rem; color: #a6adc8; line-height: 1.4; }
                .pill-stat {
                    display: inline-flex; align-items: center; gap: 6px;
                    background: rgba(243, 139, 168, 0.15); border: 1px solid rgba(243, 139, 168, 0.3);
                    color: #f38ba8; padding: 4px 12px; border-radius: 9999px; font-size: 0.8rem;
                    font-weight: 700; margin-bottom: 18px;
                }
                .task-card {
                    background: rgba(49, 50, 68, 0.6); border: 1px solid rgba(203, 166, 247, 0.25);
                    border-radius: 12px; padding: 14px; text-align: left; margin-bottom: 20px;
                }
                .task-label {
                    display: flex; align-items: center; gap: 5px;
                    font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.8px; color: #cba6f7; font-weight: 800; margin-bottom: 6px;
                }
                .task-text { font-size: 0.95rem; font-weight: 700; color: #ffffff; word-break: break-word; line-height: 1.35; }
                .timer-bar {
                    margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.08);
                    font-size: 0.78rem; color: #a6e3a1; display: flex; align-items: center; gap: 6px; font-weight: 600;
                }
                .actions { display: flex; flex-direction: column; gap: 10px; }
                .btn {
                    border: none; border-radius: 12px; padding: 13px 18px; font-size: 0.92rem; font-weight: 700;
                    cursor: pointer; transition: transform 0.15s, filter 0.2s, background-color 0.2s;
                    display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
                }
                .btn:hover { filter: brightness(1.12); transform: translateY(-2px); }
                .btn:active { transform: translateY(0); }
                .btn-primary { background: #a6e3a1; color: #11111b; box-shadow: 0 4px 15px rgba(166, 227, 161, 0.3); }
                .btn-row { display: flex; gap: 10px; }
                .btn-secondary { background: rgba(49, 50, 68, 0.8); color: #cdd6f4; border: 1px solid rgba(255, 255, 255, 0.12); flex: 1; }
                .btn-secondary:hover { background: rgba(69, 71, 90, 0.9); }
                .btn-ghost { background: transparent; color: #a6adc8; border: 1px solid transparent; flex: 1; }
                .btn-ghost:hover { color: #f38ba8; }
            </style>
            <div class="backdrop">
                <div class="modal">
                    <div class="badge-icon">${svgIcon('shield-alert', 44, '#f38ba8')}</div>
                    <h2>Mindful Pause</h2>
                    <p class="sub">Caught you scrolling <strong>${platform}</strong>!</p>
                    
                    <div class="pill-stat">
                        ${svgIcon('flame', 15, '#f38ba8')}
                        <span>${sessionScrollCount} ${sessionScrollCount === 1 ? 'short' : 'shorts'} scrolled this session</span>
                    </div>

                    <div class="task-card">
                        <div class="task-label">${svgIcon('target', 14, '#cba6f7')} Current Focus Goal</div>
                        <div class="task-text">${activeTask ? activeTask.text : 'No specific task set — pick a goal in Focus Center!'}</div>
                        ${timerRemaining ? `<div class="timer-bar">${svgIcon('clock', 14, '#a6e3a1')} Focus session active: <strong>${timerRemaining}</strong> remaining</div>` : ''}
                    </div>

                    <div class="actions">
                        <button class="btn btn-primary" id="btnExit">${svgIcon('sparkles', 16, '#11111b')} Back to Focus (Leave Shorts)</button>
                        <div class="btn-row">
                            <button class="btn btn-secondary" id="btnSnooze">${svgIcon('coffee', 15, '#cdd6f4')} Snooze 5m</button>
                            <button class="btn btn-ghost" id="btnDismiss">Just 1 more</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        shadow.getElementById('btnExit').addEventListener('click', () => {
            removeOverlay();
            if (isYouTube) window.location.href = 'https://www.youtube.com/';
            else if (isInstagram) window.location.href = 'https://www.instagram.com/';
        });

        shadow.getElementById('btnSnooze').addEventListener('click', () => {
            const fiveMins = Date.now() + 5 * 60 * 1000;
            snoozeUntil = fiveMins;
            chrome.storage.local.set({ doomscrollSnoozeUntil: fiveMins });
            removeOverlay();
            resumePageVideos();
        });

        shadow.getElementById('btnDismiss').addEventListener('click', () => {
            removeOverlay();
            resumePageVideos();
        });
    }

    function removeOverlay() {
        if (overlayHost && overlayHost.parentNode) {
            overlayHost.parentNode.removeChild(overlayHost);
            overlayHost = null;
        }
    }

    window.addEventListener('yt-navigate-finish', () => {
        checkLocationAndNudge();
    });

    const originalPushState = history.pushState;
    history.pushState = function (...args) {
        const ret = originalPushState.apply(this, args);
        setTimeout(checkLocationAndNudge, 50);
        return ret;
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function (...args) {
        const ret = originalReplaceState.apply(this, args);
        setTimeout(checkLocationAndNudge, 50);
        return ret;
    };

    window.addEventListener('popstate', () => {
        setTimeout(checkLocationAndNudge, 50);
    });

    let scrollThrottleTimer = null;
    function handleUserScrollAction() {
        if (scrollThrottleTimer) return;
        scrollThrottleTimer = setTimeout(() => {
            scrollThrottleTimer = null;
            checkLocationAndNudge();
        }, 300);
    }

    window.addEventListener('wheel', handleUserScrollAction, { passive: true });
    window.addEventListener('keydown', (e) => {
        if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space', 'j', 'k'].includes(e.code)) {
            handleUserScrollAction();
        }
    }, { passive: true });

    setInterval(checkLocationAndNudge, 700);
})();
