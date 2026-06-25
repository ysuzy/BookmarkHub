<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="https://github.com/dudor/BookmarkHub">
    <img src="images/icon128.png" alt="BookmarkHub" >
  </a>

  <h1 align="center">BookmarkHub</h1>
  <p align="center">
    BookmarkHub is a browser plug-in that can synchronize your bookmarks between different browsers.
    <br />
    <a href="https://github.com/dudor/BookmarkHub/issues">Feedback</a>
    ·
    <a href="/README_cn.md">简体中文</a>
    ·
    <a href="/README.md">English</a>
  </p>
</p>

<p align="center">
  <a href="https://github.com/dudor/BookmarkHub/releases"><img src="https://img.shields.io/badge/version-v0.1.0+-blue.svg" alt="Version"></a>
  <a href="https://github.com/dudor/BookmarkHub/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"></a>
  <a href="https://chrome.google.com/webstore/detail/bookmarkhub-sync-bookmark/fohimdklhhcpcnpmmichieidclgfdmol"><img src="https://img.shields.io/badge/chrome-available-brightgreen.svg" alt="Chrome"></a>
  <a href="https://addons.mozilla.org/en/firefox/addon/BookmarkHub/"><img src="https://img.shields.io/badge/firefox-available-brightgreen.svg" alt="Firefox"></a>
  <a href="https://microsoftedge.microsoft.com/addons/detail/BookmarkHub/fdnmfpogadcljhecfhdikdecbkggfmgk"><img src="https://img.shields.io/badge/edge-available-brightgreen.svg" alt="Edge"></a>
</p>

<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary><h2 style="display: inline-block">Table of Contents</h2></summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#features">Features</a></li>
    <li><a href="#whats-new-in-v010">What's New in v0.1.0+</a></li>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#usage">Usage</a>
      <ul>
        <li><a href="#basic-usage-bookmark-sync">Basic Usage (Bookmark Sync)</a></li>
        <li><a href="#scheduled-auto-sync-new">Scheduled Auto Sync (New)</a></li>
        <li><a href="#ai-bookmark-organizer-new">AI Bookmark Organizer (New)</a></li>
      </ul>
    </li>
    <li><a href="#self-hosting-the-ai-backend">Self-hosting the AI Backend</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

BookmarkHub is a browser plug-in that can synchronize your bookmarks between different browsers.

For major browsers such as Chrome, Firefox, Microsoft Edge, and more.

It uses GitHub's Gist records to store browser bookmarks for safe and secure use.

![BookmarkHub](images/3.gif)

![BookmarkHub](images/1.png)

![BookmarkHub](images/2.png)

## Features

**Bookmark Sync**
* No registration required, just use the Token and Gist of your GitHub account
* Easy to upload and download bookmarks with one click
* Clear all local bookmarks with one click
* Support cross-machine and cross-browser synchronization of bookmarks
* Support to display the number of local and remote bookmarks
* Auto-sync on browser startup (configurable)

**Scheduled Auto Sync** *(new in v0.1.0+)*
* Background auto-sync on a configurable schedule (15 min – 72 h) — no more forgetting to sync
* Three sync directions: **Upload** (local → Gist), **Download** (Gist → local), or **Bidirectional**
* Optional "Sync on Browser Startup" — pull the latest bookmarks the moment Chrome launches
* "Run Now" button for one-off manual triggers from the Options page
* Battery- & API-friendly: uses the Chrome `alarms` API (MV3 Service Worker compatible — `setInterval` is not allowed in MV3); the Service Worker wakes up only at the configured interval, then sleeps again
* Robust failure handling: missing config → desktop notification, conflict with manual sync → silent skip, network failure → `Last sync` timestamp not updated

**AI Bookmark Organizer** *(new in v0.1.0+)*
* One-click AI categorization of all bookmarks into 10 top-level categories (Tech / AI Tools / Learning / Online Tools / Social Media / Entertainment / Shopping / Finance / News / Lifestyle / Other)
* LLM-driven classification with built-in normalization layer to handle edge cases
* Real-time progress in a popup window with a "Reset" escape hatch
* Results merged into a dedicated `AIOrganized` root folder inside your Gist
* **Self-hosted backend** — you control your data and your LLM API key

## What's New in v0.1.0+

**Highlights**

* 🤖 **AI Bookmark Organizer** — One-click organization of all bookmarks into 10 categories via LLM (see [Usage → AI Bookmark Organizer](#ai-bookmark-organizer-new)).
* ⏰ **Scheduled Auto Sync** — Background sync on a configurable interval (15 min – 72 h) with three directions (Upload / Download / Bidirectional). Optional "Sync on Browser Startup" trigger. Uses the Chrome `alarms` API (MV3-compatible) so the Service Worker stays asleep between syncs. See [Usage → Scheduled Auto Sync](#scheduled-auto-sync-new).
* ⚡ **Auto-sync on startup** — Option to automatically pull latest bookmarks from your Gist when the browser starts.
* 🎯 **Real-time progress UI** — A popup window opens automatically and shows progress (with a reset escape hatch if anything goes wrong).
* 📊 **Result modal** — After completion, a summary modal appears (in the options page) with category breakdown and one-click "Download Bookmarks".
* 🔒 **Privacy-first backend** — Backend URL is **never** pre-filled; you must enter your own self-hosted endpoint. No telemetry.

**Bug Fixes**

* Fixed Chrome MV3 `messages.json` mixed-format i18n bug (some locales had flat-string keys, others object format — Chrome silently refuses to load such files).
* Fixed options-page result modal: previously relied on popup auto-opening via `chrome.alarms`, which was unreliable due to service-worker sleep.
* Added [`scripts/validate_locales.py`](../scripts/validate_locales.py) — run before any i18n PR to catch format regressions.

**For Self-hosters**

* Removed the hard-coded default backend URL — defaults to empty string in v0.1.0+. You must explicitly enter your backend URL.
* See [Self-hosting the AI Backend](#self-hosting-the-ai-backend) for a 5-minute setup guide.

**Upgrade Notes**

* If you previously used a hosted AI backend, you now need to self-host one. See setup below.
* Existing users who never enabled AI Organize are unaffected.

## Installation

> This plug-in requires bookmarks to be stored in Gist, so make sure you have a GitHub account or register your GitHub account over the network.

* [Chrome](https://chrome.google.com/webstore/detail/bookmarkhub-sync-bookmark/fohimdklhhcpcnpmmichieidclgfdmol)
* [Firefox](https://addons.mozilla.org/en/firefox/addon/BookmarkHub/)
* [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/BookmarkHub/fdnmfpogadcljhecfhdikdecbkggfmgk)
* [Other browsers based on the Chromium kernel](https://chrome.google.com/webstore/detail/bookmarkhub-sync-bookmark/fohimdklhhcpcnpmmichieidclgfdmol)

For developers / latest unreleased version, see [Building from Source](#building-from-source).

<!-- USAGE EXAMPLES -->
## Usage

### Basic Usage (Bookmark Sync)

1. [Login](https://github.com/login) GitHub. If you don't have an account, [click here to register](https://github.com/join).
2. [Create a token that manages the gist](https://github.com/settings/tokens/new).
3. [Create a secret gist](https://gist.github.com). **Note: If it's a public gist, your bookmarks can be searched by others.**
4. Install BookmarkHub from your browser's store. Click the plug-in's settings button, fill in the token and gist ID in the pop-up settings window, and you can upload / download bookmarks.

### Scheduled Auto Sync *(new in v0.1.0+)*

> Stop remembering to sync. BookmarkHub can run in the background on a schedule and keep your local bookmarks and your Gist in sync automatically.

**How it works**

BookmarkHub uses the Chrome `alarms` API (MV3 Service Worker compatible) to schedule background sync. The Service Worker wakes up at the configured interval, runs the sync, then sleeps again — your computer and browser stay idle between syncs.

* **Default interval**: 60 minutes
* **Minimum interval**: 15 minutes (hard-coded — the Chrome `alarms` API supports 1 min, but values below 15 min are clamped internally to avoid GitHub API rate limits and aggressive Service Worker wake-ups)
* **Available intervals**: `15 min` / `30 min` / `1 h` / `2 h` / `6 h` / `12 h` / `24 h` / `48 h` / `72 h`
* **No `setInterval`**: MV3 Service Workers terminate after ~30 s of inactivity. The `alarms` API is the only reliable way to run background tasks in MV3.
* **Persistence**: the alarm is created/refreshed on extension install/update, on browser startup, and whenever you save your settings. Disabling the feature in Options immediately clears the alarm.

**Three sync directions**

| Direction | Behavior | Typical use case |
|-----------|----------|------------------|
| `Upload` (local → Gist) | Pushes local bookmarks to your Gist | You mainly edit bookmarks on this machine |
| `Download` (Gist → local) | Pulls the latest bookmarks from your Gist | You edit on a different machine, this one follows |
| `Bidirectional` (download then upload) | Pulls first, then pushes | You edit on multiple machines |

**Optional: Sync on browser startup**

In addition to the periodic schedule, you can enable **"Sync on Browser Startup"** to trigger an immediate sync the moment the browser launches. The most common workflow is: open Chrome → bookmarks are already fresh.

**Failure handling**

* **Missing config** (no Token / Gist ID / file name) → the sync is **skipped**, and a desktop notification is shown (if notifications are enabled). The `Last Auto Sync` timestamp is **not** updated.
* **Another operation is in progress** (manual upload/download, AI organize, etc.) → the auto sync is silently skipped. The next alarm fire will retry.
* **Network / API failure** → the `Last Auto Sync` timestamp is **not** updated. Check the Service Worker console for details: `chrome://extensions` → BookmarkHub → **Service Worker** link.
* **Auto sync running at the same time as a manual sync** is prevented by an internal lock (`curOperType`) — no race conditions, no double-uploads.

**How to enable**

1. Open the **Options** page (right-click the extension icon → Options, or `chrome-extension://<id>/options.html`).
2. Scroll to the **"Scheduled Auto Sync"** section.
3. Tick **"Enable Auto Sync"**.
4. Pick an **interval** and a **sync direction**.
5. (Optional) Tick **"Sync on Browser Startup"**.
6. Click **"Save"**. The Service Worker creates / refreshes the alarm immediately — no browser restart needed.
7. (Optional) Click **"Run Now"** to trigger an immediate sync without waiting for the next interval.

The `Last Auto Sync` field shows the timestamp of the most recent successful automatic sync.

### AI Bookmark Organizer *(new)*

> **Requires a self-hosted backend** — see [Self-hosting the AI Backend](#self-hosting-the-ai-backend) for setup.

Once your backend is running:

1. Open **Options** page (right-click the extension icon → Options, or `chrome-extension://<id>/options.html`).
2. Find the **"AI Organize"** section.
3. Fill in **AI Organize Backend URL** with your backend URL, e.g. `http://localhost:18903`.
4. (Optional) Adjust any other AI options.
5. Click **"🚀 Start AI Organize"**.
6. A popup window opens automatically showing live progress.
7. When done, a **result modal** appears with category breakdown. Click **"Download Bookmarks"** to sync the categorized bookmarks to your browser.

**What happens under the hood**

* The backend reads your bookmarks from your GitHub Gist (using the same Token you already configured).
* Each bookmark's URL is fetched (title + description), then sent in batches to an LLM for classification.
* The LLM picks from 10 fixed categories (see list below).
* Results are written to your Gist as a new top-level folder `AIOrganized` containing one sub-folder per category.
* Click **Download Bookmarks** in the extension → the new folder structure syncs to your browser.

**The 10 Categories**

| # | Category | Examples |
|---|----------|----------|
| 1 | Tech Development | GitHub, Stack Overflow, MDN, dev tools |
| 2 | AI Tools | ChatGPT, Claude, Midjourney, Cursor |
| 3 | Learning & Education | Online courses, tutorials, docs, schools |
| 4 | Online Tools | Converters, calculators, temp mail, cloud drives |
| 5 | Social Media | Twitter, Weibo, Zhihu, YouTube, Discord |
| 6 | Entertainment | Videos, games, music, comics |
| 7 | Shopping | JD, Taobao, Amazon, deal sites |
| 8 | Finance & Crypto | Banks, stocks, crypto wallets, exchanges |
| 9 | News | News outlets, blogs, RSS, podcasts |
| 10 | Lifestyle | Food, travel, weather, health, jobs |

If the LLM produces more than 10 distinct categories, the smallest ones are merged into "Other".

**Troubleshooting**

* **"Backend URL not configured"** — Go to Options and fill in the backend URL.
* **"Task stuck at 0%"** — Click the **"⚠️ Task stuck? Reset"** button in the popup, then try again. Also check the backend's `server.log`.
* **"403 Forbidden"** — Your Gist Token is invalid or expired. Re-create one.
* **Categories look wrong** — Check that the LLM model is reachable. See backend logs.

## Self-hosting the AI Backend

> **Why self-host?** Because the AI Organizer needs to read your Gist and call an LLM, the backend runs on YOUR machine so your Token and bookmarks never leave your control.

**Minimum requirements**: Python 3.10+, 512 MB RAM, a reachable LLM API (any OpenAI-compatible endpoint).

**5-minute setup**:

```bash
# 1. Get the backend code (separate repository)
git clone https://github.com/your-name/BookmarkHub-AI-Organizer.git
cd BookmarkHub-AI-Organizer

# Or use a directory of your own choosing; the backend is self-contained.

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
export MINIMAX_API_KEY="sk-xxxxxxxxxxxxxxxx"   # Your LLM API key
export MINIMAX_MODEL="abab6.5s-chat"            # Or any OpenAI-compatible model
export PORT=18903

# 4. Start the server
python3 main.py
# Or with uvicorn directly:
uvicorn main:app --host 0.0.0.0 --port 18903
```

**Verify it works**:

```bash
curl http://localhost:18903/api/health
# Expected: {"status": "ok"}
```

**In the extension**:

* Open Options → AI Organize Backend URL → enter `http://localhost:18903` (or your public URL if remote).

**API Endpoints**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/organize/start` | Start a new organize task |
| GET | `/api/organize/{task_id}/status` | Poll progress |
| GET | `/api/organize/{task_id}/result` | Fetch final result |
| GET | `/api/health` | Health check |

For full documentation, see [`docs/AI_ORGANIZER.md`](docs/AI_ORGANIZER.md).

## Building from Source

```bash
git clone https://github.com/dudor/BookmarkHub.git
cd BookmarkHub
pnpm install
pnpm build           # produces .output/chrome-mv3/
# Load .output/chrome-mv3/ as an unpacked extension in chrome://extensions
```

<!-- ROADMAP -->
## Roadmap

- [x] Auto-sync bookmarks on browser startup *(shipped in v0.1.0+)*
- [x] Scheduled background auto-sync (configurable interval) *(shipped in v0.1.0+)*
- [x] AI Bookmark Organizer *(shipped in v0.1.0+)*
- [ ] WebDAV protocol support
- [ ] Mobile app
- [ ] Import / Export (HTML, JSON)
- [ ] Share bookmarks

<!-- LICENSE -->
## License

See `LICENSE` for more information.

<!-- CONTACT -->
## Contact

dudor

Project Link: [https://github.com/dudor/BookmarkHub](https://github.com/dudor/BookmarkHub)