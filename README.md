# Focus Command Center — Chrome Extension

An all-in-one Chrome Extension (Manifest V3) designed for deep work, productivity, and mindful browsing. It combines a customizable Pomodoro timer, procedural ambient soundscapes, an anti-doomscroll blocker for Shorts & Reels, daily focus analytics with streaks, an Arc Browser-inspired 2D color customization studio, and an article distraction cleaner inside Chrome's native Side Panel.

---

## 🚀 Features

- **Borderless, Modern UI**: Designed without clunky header bars for an edge-to-edge, minimalist aesthetic.
- **Lucide Vector Icons**: Replaced all emojis with crisp vector icons from Lucide React.
- **Arc-Style Theme Studio (2D Color Picker Grid)**:
  - Drag your mouse across a 2D chromatic grid (Hue × Saturation/Lightness) to sculpt a live custom color palette.
  - Dynamic ambient background glow and accent adaptation in real-time.
  - Curated Arc preset palettes: *Electric Lilac, Arc Sunset, Oceanic Cyan, Emerald Zen, Cyber Rose, Warm Amber, Slate Stealth*.
  - 100% persistent via `chrome.storage.local`.
- **Integrated Master Music Player**:
  - Direct focus music playback: click Play to instantly start Lofi beats or ambient soundscapes.
  - Animated spinning vinyl record graphic when active.
  - Universal media remote: controls external Spotify, YouTube, or SoundCloud tabs when playing.
  - Next / Prev buttons cycle through focus stations.
- **Ambient Soundscapes (Web Audio API & Lo-Fi Streams)**:
  - 🎵 **Lofi Radio**: Live 24/7 stream with offline procedural jazzy 7th chill synth fallback.
  - 🌧️ **Rain & Thunder**: Procedural pink noise with low-frequency rain swells.
  - 📻 **Deep Brown Noise**: Scientifically tuned for ADHD calming and deep concentration.
  - 🌊 **Ocean Waves**: Rhythmic 8-second wave surges.
  - ☕ **Cozy Café**: Warm background hum and ambient café frequency chatter.
  - 🧠 **40Hz Gamma Focus**: Binaural beat frequency for peak cognitive performance.
  - 🔉 **Integrated Master Volume Slider**: Fine-tune audio levels from 0% to 100%.
- **Meditation Chime & Bell**:
  - Serene Tibetan singing bowl harmonic chime (528 Hz) when a focus session completes.
  - Bright two-tone chime when your break ends.
- **Anti-Doomscroll Intervention & Daily Allowance (Shorts & Reels)**:
  - Intercepts **YouTube Shorts** (`/shorts/`) and **Instagram Reels** (`/reels/`, `/reel/`).
  - **Daily Allowance Mode**: Set a daily quota (Strict 0m, 5m, 10m, 15m, 30m, or Unlimited).
  - Floating in-page time badge displaying remaining budget.
  - Auto-pauses videos upon scrolling and displays your active focus task and timer with Lucide icons.
- **Focus Tasks & To-Do System**:
  - Quick task checklist with Lucide star pinning, filters (All, Active, Done), and one-click clear.
  - Pin any task as your **Current Focus Goal** directly above the Pomodoro timer.
- **Article Zen Reader**:
  - One-click distraction stripper that cleans clutter, banners, and ads for calm reading.
- **Global Keyboard Shortcuts**:
  - <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> — Start / Pause Focus Timer
  - <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd> — Toggle Focus Music
  - <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> — Clean Article (Zen Reader)

---

## 🛠️ Tech Stack & Architecture

- **Manifest Version**: Manifest V3
- **Icons**: Lucide Icons vector SVGs (`sidepanel/icons.js`)
- **Theme Engine**: 2D chromatic pointer plane with live CSS custom property injection
- **Audio Engine**: `sidepanel/offscreen.html` & `sidepanel/offscreen.js` (Web Audio API procedural synth + stream fallback)
- **Background Worker**: `background.js` (Chrome alarms, storage analytics, commands, media queries, and dynamic blocking)
- **Content Script**: `sidepanel/content.js` (DOM manipulation, anti-doomscroll overlay, and watch-time tracker)
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
    ├── index.html       # Side panel interface (no bulky top bar, Lucide icons)
    ├── style.css        # Dynamic Arc chromatic theme & Catppuccin design system
    ├── icons.js         # Lucide vector icons library
    ├── main.js          # Side panel UI controller & Arc theme studio logic
    ├── content.js       # Content script (Zen Reader & Doomscroll intervention)
    ├── offscreen.html   # Offscreen document HTML
    └── offscreen.js     # Web Audio API soundscape synthesizer & stream player
```

---

## ⚙️ Installation & Usage

1. Open **Google Chrome** and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select this project's folder (`d:\Focus-Extension`).
5. Open the extension from the Chrome toolbar or open the **Side Panel** (`Ctrl + Shift + Y` or click the extension icon).
