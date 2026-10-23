# Focus Command Center — Chrome Extension

An all-in-one Chrome Extension (Manifest V3) designed for deep work, productivity, and distraction-free browsing. It combines a Pomodoro timer, ambient media & sound player, article reading focus mode, and quick notes/task management in a side panel UI.

---

## 🚀 Features

- **Side Panel Interface**: Accessible alongside any browser tab for quick context switching without breaking workflow.
- **Pomodoro Timer**: Customizable focus and break timers with automated notifications and persistence via offscreen documents.
- **Ambient & Media Player**: Built-in sound generator and audio controls to maintain concentration.
- **Article Focus Mode**: Content script injection to strip away web page clutter, ads, and sidebars for clean reading.
- **Task & Notes Manager**: Quick todo list and persistent note scratchpad saved locally via `chrome.storage`.

---

## 🛠️ Tech Stack & Architecture

- **Manifest Version**: Manifest V3
- **Background Worker**: `background.js` (Service worker handling Chrome API events, tab listeners, and state)
- **Side Panel UI**: `sidepanel/index.html`, `sidepanel/main.js`, `sidepanel/style.css`
- **Content Script**: `sidepanel/content.js` (Page manipulation and article focus injection)
- **Offscreen Document**: `sidepanel/offscreen.html` & `sidepanel/offscreen.js` (Background audio playback and timer resilience)

---

## 📂 File Structure

```
Focus Extension/
├── manifest.json         # Extension configuration & Manifest V3 permissions
├── background.js        # Service worker script (Alarms, timer state, media & blocking)
├── icons/               # Extension icons (16px, 32px, 48px, 128px)
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── sidepanel/
    ├── index.html       # Side panel markup
    ├── style.css        # Catppuccin Mocha styles & design system
    ├── main.js          # Main UI controller & state management
    ├── content.js       # Web page content script (Zen reader)
    ├── offscreen.html   # Offscreen document HTML
    └── offscreen.js     # Offscreen audio stream logic
```

---

## ⚙️ Installation & Usage

1. Open **Google Chrome** and navigate to `chrome://extensions`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click **Load unpacked**.
4. Select this project's folder (`d:\Focus-Extension`).
5. Open the extension from the Chrome toolbar or open the **Side Panel** (`Ctrl + Shift + Y` or click the extension icon).

