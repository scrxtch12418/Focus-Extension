# Focus Command Center — Chrome Extension

An all-in-one Chrome Extension (Manifest V3) designed for deep work, productivity, and mindful browsing. It combines a customizable Pomodoro timer, procedural ambient soundscapes, an anti-doomscroll blocker for Shorts & Reels, daily focus analytics with streaks, and an article distraction cleaner inside Chrome's native Side Panel.

---

## 🚀 Features

- **Side Panel Interface**: Accessible alongside any browser tab for seamless multitasking without breaking workflow.
- **Daily Focus Analytics & Streaks**:
  - Track day streak (🔥 *X Days*).
  - Daily focus time counter (⏱️ *Xh Ym focused today*).
  - Doomscroll tally (🛑 *X Shorts Avoided*).
  - Automatic midnight rollover and historical tracking.
- **Ambient Soundscapes & Volume Control**:
  - 🎵 **Lofi Radio**: Live 24/7 lo-fi beats from CodeRadio.
  - 🌧️ **Rain & Storm**: Soothing procedural rain with gentle low-frequency rumble.
  - 📻 **Deep Brown Noise**: Scientifically proven for ADHD calming and deep concentration.
  - 🌊 **Ocean Waves**: Rhythmic 8-second wave swells generated with Web Audio API.
  - ☕ **Cozy Café**: Warm ambient murmur and low hum.
  - 🔉 **Integrated Master Volume Slider**: Fine-tune audio levels from 0% to 100%.
- **Meditation Chime & Bell**:
  - Serene Tibetan singing bowl harmonic chime (528 Hz) when a focus session completes.
  - Bright two-tone chime when your break ends.
- **Anti-Doomscroll Intervention & Daily Allowance (Shorts & Reels)**:
  - Intercepts **YouTube Shorts** (`/shorts/`) and **Instagram Reels** (`/reels/`, `/reel/`).
  - **Daily Allowance Mode**: Set a daily quota (Strict 0m, 5m, 10m, 15m, 30m, or Unlimited).
  - Floating in-page time badge displaying remaining budget.
  - Auto-pauses videos upon scrolling and displays your active focus task and timer.
- **Focus Tasks & To-Do System**:
  - Quick task checklist with Catppuccin checkboxes, filters (All, Active, Done), and one-click clear.
  - Pin any task (★) as your **Current Focus Goal** directly above the Pomodoro timer.
- **Universal Media Controller**:
  - Detects active audio/video playback (Spotify, YouTube, SoundCloud) with album art and skip/pause controls.
- **Article Zen Reader**:
  - One-click distraction stripper that cleans clutter, banners, and ads for calm reading.
- **Global Keyboard Shortcuts**:
  - <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> — Start / Pause Focus Timer
  - <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> — Toggle Ambient Audio / Soundscapes
  - <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> — Clean Article (Zen Reader)

---

## 🛠️ Tech Stack & Architecture

- **Manifest Version**: Manifest V3
- **Background Worker**: `background.js` (Service worker handling Chrome alarms, storage analytics, commands, media queries, and dynamic blocking)
- **Side Panel UI**: `sidepanel/index.html`, `sidepanel/main.js`, `sidepanel/style.css` (Catppuccin Mocha aesthetic)
- **Content Script**: `sidepanel/content.js` (DOM manipulation, anti-doomscroll overlay, and watch-time tracker)
- **Offscreen Audio Engine**: `sidepanel/offscreen.html` & `sidepanel/offscreen.js` (Procedural Web Audio API soundscapes and audio persistence)
- **Privacy & Compliance**: `PRIVACY.md` (100% local-first data storage)

---

## 📂 File Structure

```
Focus-Extension/
├── manifest.json         # Extension configuration, MV3 permissions & shortcuts
├── background.js        # Background service worker (Alarms, analytics, commands)
├── PRIVACY.md           # Chrome Web Store compliant privacy policy
├── README.md            # Documentation and setup guide
├── icons/               # Extension icons (16px, 32px, 48px, 128px)
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── sidepanel/
    ├── index.html       # Side panel interface
    ├── style.css        # Catppuccin Mocha design system
    ├── main.js          # Side panel UI controller & state sync
    ├── content.js       # Content script (Zen Reader & Doomscroll intervention)
    ├── offscreen.html   # Offscreen document HTML
    └── offscreen.js     # Web Audio API soundscape synthesizer & chime engine
```

---

## ⚙️ Installation & Developer Mode

1. Open **Google Chrome** and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select this project's folder (`d:\Focus-Extension`).
5. Open the extension from the Chrome toolbar or open the **Side Panel** (`Ctrl + Shift + Y` or click the extension icon).

---

## 🛒 Chrome Web Store Upload Checklist

1. **ZIP the Extension**: Compress all files in this directory (exclude `.git`).
2. **Developer Dashboard**: Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. **Upload ZIP**: Upload your ZIP file as a new item.
4. **Store Assets**:
   - Icon: `icons/icon-128.png`
   - Promo Tile: 440 × 280 px
   - Screenshots: 1280 × 800 px (Take 2-3 screenshots of the sidepanel in action)
5. **Privacy Tab**: Point the privacy policy URL to your hosted `PRIVACY.md` (e.g., GitHub Pages or public repository raw URL).
6. **Single Purpose Field**: *"A distraction blocker and deep work dashboard combining Pomodoro workflow, ambient focus audio, and mindful doomscrolling prevention."*
