# Privacy Policy for Focus Command Center

**Effective Date:** November 1, 2026  
**Extension Name:** Focus Command Center  
**Developer Contact:** Developer / Creator of Focus Command Center  

---

## 1. Overview & Commitment
Focus Command Center is committed to protecting your privacy. We believe that productivity software should help you focus without compromising your personal data. 

**Focus Command Center operates on a 100% local-first principle.** All data, settings, tasks, and timer metrics stay exclusively on your personal device. We do not collect, store, sell, or transmit any personally identifiable information (PII) to remote servers or third-party advertisers.

---

## 2. Information We Store Locally
All data utilized by Focus Command Center is saved strictly within your browser's local sandbox using the standard `chrome.storage.local` API:

- **Focus Tasks & To-Dos**: Your custom tasks, checklist items, and active focus goal.
- **Timer Preferences**: Custom session durations, target session counts, and chime preferences.
- **Daily Analytics**: Day streak, total daily focus minutes, and count of shorts intercepted today.
- **Doomscroll Settings**: Custom daily Shorts/Reels allowance minutes and snooze timestamps.
- **URL Blocklists**: Domains you choose to block during deep focus sessions.

None of this information ever leaves your computer or browser profile.

---

## 3. Chrome Permissions & Why We Need Them
Focus Command Center requests only the minimum set of permissions necessary to function:

- **`storage`**: Used to persist your tasks, session goals, analytics, and settings locally across browser restarts.
- **`sidePanel`**: Allows the extension to open its dashboard inside Chrome's dedicated side panel interface.
- **`notifications`**: Sends desktop alerts when your focus session or break ends.
- **`alarms`**: Ensures Pomodoro timers run accurately in the background without battery-draining polling.
- **`offscreen`**: Enables the browser to play local ambient audio streams and gentle meditation chimes when the timer finishes.
- **`scripting` & `activeTab`**: Allows the Zen Reader feature to remove ads and clutter on the currently active tab when explicitly requested by you.
- **`declarativeNetRequest`**: Used strictly to enforce your chosen site-blocking rules during focus sessions.
- **Host Permissions (`<all_urls>`)**: Enables the anti-doomscroll reminder on Instagram Reels and YouTube Shorts, as well as the Zen Article Cleanser across user-selected news and article sites.

---

## 4. Third-Party Services & Audio Streams
- **Lofi Radio Stream**: When enabled, the ambient audio player connects to the FreeCodeCamp CodeRadio stream (`coderadio-admin.freecodecamp.org`). No user data is sent with this audio stream request.
- **Procedural Soundscapes**: Rain, Brown Noise, Ocean Waves, and Meditation Bells are generated 100% procedurally and offline on your machine using the Web Audio API.

---

## 5. Children’s Privacy
Focus Command Center does not collect any personal information from anyone, including children under the age of 13.

---

## 6. Updates to This Policy
If this Privacy Policy is updated in future releases, changes will be published in this document and reflected in the extension's release notes.

---

## 7. Contact
If you have any questions or feedback regarding this Privacy Policy, please open an issue in the extension's repository.

