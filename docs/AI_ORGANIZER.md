# AI Bookmark Organizer — Setup Guide

> Companion document to the main [README](../README.md). This file goes deep on deploying the AI backend that powers the "AI Bookmark Organizer" feature in BookmarkHub v0.1.0+.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Why Self-host?](#why-self-host)
3. [Requirements](#requirements)
4. [Quick Start (5 minutes)](#quick-start-5-minutes)
5. [Configuration Reference](#configuration-reference)
6. [Production Deployment](#production-deployment)
7. [Security Checklist](#security-checklist)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)
10. [FAQ](#faq)

---

## Architecture

```
┌────────────────────┐        ┌──────────────────────┐        ┌────────────────┐
│  Chrome Extension  │        │  Your Backend        │        │  External      │
│  (BookmarkHub)     │───────▶│  (FastAPI on :18903) │───────▶│  • GitHub Gist │
│                    │        │                      │        │  • LLM API     │
│  - Click "Start"   │◀───────│  - Reads Gist        │◀───────│  • Bookmark    │
│  - Show progress   │  poll  │  - Calls LLM         │        │    URLs (HTML) │
└────────────────────┘        └──────────────────────┘        └────────────────┘
```

**Data flow**

1. User clicks **"🚀 Start AI Organize"** in extension Options page.
2. Extension POSTs to backend `/api/organize/start` with the user's Gist Token + Gist ID + filename.
3. Backend reads the full bookmark tree from Gist, walks all leaves.
4. For each bookmark, backend fetches the page (title + meta description) — best effort, failures are skipped.
5. Bookmarks are batched (default 20/batch) and sent to LLM for classification.
6. LLM returns `{url: category}` for each batch.
7. Backend applies a normalization layer + enforces 10-category cap (smallest merged into "Other").
8. Result is merged into a new top-level root `AIOrganized` in the Gist (one sub-folder per category).
9. Extension polls `/api/organize/{task_id}/status` every 1.5 s — popup shows live progress.
10. On completion, extension shows a summary modal → user clicks **"Download Bookmarks"** → new folder structure syncs to local browser.

---

## Why Self-host?

The AI Organizer feature requires:

- **Read access** to your Gist (containing all your bookmarks)
- **Outbound LLM API calls** to classify them
- **Write access** to your Gist to save results

Because both your Gist Token and (optionally) your LLM API Key are sensitive, **the backend runs on YOUR machine** so they never leave your control.

**You don't trust hosted services with your bookmarks?** Self-host. **You want zero telemetry?** Self-host. **You have a custom LLM endpoint (Azure / Bedrock / local Ollama)?** Self-host and just point `LLM_BASE_URL` at it.

---

## Requirements

| Item | Minimum | Recommended |
|------|---------|-------------|
| Python | 3.10 | 3.11+ |
| RAM | 256 MB | 512 MB |
| Disk | 100 MB | 500 MB (for logs) |
| Network | HTTPS egress to `api.github.com` + LLM provider | Same |
| LLM | Any OpenAI-compatible chat completion endpoint | Model with ≥ 8B params (e.g. abab6.5s-chat, gpt-4o-mini, llama-3-8b) |

---

## Quick Start (5 minutes)

### Step 1: Get the code

```bash
git clone https://github.com/your-name/BookmarkHub-AI-Organizer.git
cd BookmarkHub-AI-Organizer
```

> **Note**: The backend lives in a separate repository from the Chrome extension. Replace `your-name` with the actual GitHub user / org hosting the backend. The backend is self-contained — you can also copy it to a directory of your choice.

### Step 2: Install dependencies

```bash
pip install -r requirements.txt
```

> Recommended: use a virtualenv to isolate from system packages.
> ```bash
> python3 -m venv .venv
> source .venv/bin/activate
> pip install -r requirements.txt
> ```

### Step 3: Configure environment

```bash
# Required: your LLM API key
export LLM_API_KEY="sk-xxxxxxxxxxxxxxxx"

# Optional: override defaults
export LLM_BASE_URL="https://api.openai.com/v1"   # default
export LLM_MODEL="gpt-4o-mini"                    # default
export PORT=18903                                  # default
```

For providers that don't follow OpenAI's exact API shape, you may need to override `LLM_BASE_URL` and `LLM_MODEL`. Any OpenAI-compatible endpoint (vLLM, Ollama, LM Studio, Azure OpenAI, MiniMax, etc.) works.

### Step 4: Start the server

```bash
# Development mode (auto-reload)
python3 main.py

# Or production mode
uvicorn main:app --host 0.0.0.0 --port 18903
```

You should see:

```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:18903 (Press CTRL+C to quit)
```

### Step 5: Verify

```bash
curl http://localhost:18903/api/health
# {"status":"ok"}
```

### Step 6: Configure the extension

1. Open BookmarkHub **Options** page.
2. Scroll to **"AI Organize"** section.
3. Fill in **AI Organize Backend URL** = `http://localhost:18903`
4. (Optional) Click **"Test Connection"** to verify.
5. Click **"🚀 Start AI Organize"**.

That's it! A popup opens automatically and shows progress.

---

## Configuration Reference

All configuration is via environment variables. No config files needed.

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `LLM_API_KEY` | — | ✅ | Your LLM provider API key |
| `LLM_BASE_URL` | `https://api.openai.com/v1` | ❌ | OpenAI-compatible API endpoint |
| `LLM_MODEL` | `gpt-4o-mini` | ❌ | Model name to use |
| `PORT` | `18903` | ❌ | HTTP port |
| `LOG_LEVEL` | `INFO` | ❌ | `DEBUG` / `INFO` / `WARNING` / `ERROR` |
| `MAX_CATEGORIES` | `10` | ❌ | Hard cap; over-cap categories merge into "Other" |
| `BATCH_SIZE` | `20` | ❌ | URLs per LLM call |
| `FETCH_TIMEOUT` | `10` | ❌ | Seconds to wait per page fetch |
| `TASK_TTL_SECONDS` | `3600` | ❌ | How long to keep task results in memory |

### Example: Using Ollama (local LLM)

```bash
# Start Ollama server with a model
ollama serve &
ollama pull llama3

# Configure backend to use it
export LLM_BASE_URL="http://localhost:11434/v1"
export LLM_MODEL="llama3"
export LLM_API_KEY="ollama"  # Ollama doesn't check the key, but our code requires one
python3 main.py
```

### Example: Using Azure OpenAI

```bash
export LLM_BASE_URL="https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT"
export LLM_MODEL="gpt-4o-mini"
export LLM_API_KEY="YOUR_AZURE_KEY"
python3 main.py
```

---

## Production Deployment

### Option A: systemd service (Linux)

Create `/etc/systemd/system/bookmarkhub-ai.service`:

```ini
[Unit]
Description=BookmarkHub AI Organizer
After=network.target

[Service]
Type=simple
User=bookmarkhub
WorkingDirectory=/opt/BookmarkHub-AI-Organizer
Environment="LLM_API_KEY=sk-xxxxxxxx"
Environment="LLM_BASE_URL=https://api.openai.com/v1"
Environment="LLM_MODEL=gpt-4o-mini"
Environment="PORT=18903"
ExecStart=/opt/BookmarkHub-AI-Organizer/.venv/bin/python3 main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now bookmarkhub-ai
sudo systemctl status bookmarkhub-ai
```

### Option B: Docker

`Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 18903
CMD ["python3", "main.py"]
```

```bash
docker build -t bookmarkhub-ai .
docker run -d \
  --name bookmarkhub-ai \
  --restart unless-stopped \
  -p 18903:18903 \
  -e LLM_API_KEY="sk-xxxxxxxx" \
  -e LLM_MODEL="gpt-4o-mini" \
  bookmarkhub-ai
```

### Option C: Reverse proxy + HTTPS (recommended for remote access)

```nginx
# /etc/nginx/sites-available/bookmarkhub-ai
server {
    listen 443 ssl http2;
    server_name ai.example.com;

    ssl_certificate /etc/letsencrypt/live/ai.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ai.example.com/privkey.pem;

    # Restrict to yourself only (replace with your IP)
    allow YOUR.PUBLIC.IP.HERE;
    deny all;

    location / {
        proxy_pass http://127.0.0.1:18903;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # SSE / streaming
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
```

Then in the extension, use `https://ai.example.com` as the backend URL.

---

## Security Checklist

- [ ] **Never** expose `18903` to the public internet without HTTPS + authentication.
- [ ] **Never** commit your `LLM_API_KEY` to git.
- [ ] **Never** use a Gist Token with broader scope than `gist` — only grant `gist` permission when creating the token.
- [ ] Rotate your `LLM_API_KEY` and Gist Token regularly (every 90 days recommended).
- [ ] Enable firewall rules to restrict port 18903 to localhost (or your reverse proxy).
- [ ] Review backend logs for unusual activity.
- [ ] Use HTTPS if accessing remotely.

---

## Troubleshooting

### "Connection refused"

* Backend not running → `python3 main.py` in the backend directory.
* Wrong port → check `PORT` env var, default is `18903`.
* Wrong URL in extension → verify it's exactly `http://localhost:18903` (no trailing slash).

### "401 Unauthorized" / "403 Forbidden"

* **Extension → backend**: Not applicable (backend has no auth by default; restrict via firewall).
* **Backend → LLM**: API key invalid or expired. Check `LLM_API_KEY`.
* **Backend → Gist**: Gist Token invalid or lacks `gist` scope. Re-create at https://github.com/settings/tokens/new.

### "Task stuck at 0%"

* Check backend logs (`server.log` by default).
* Common cause: LLM API is slow or timing out. Try a faster model or reduce `BATCH_SIZE`.
* Click **"⚠️ Reset"** in the popup and try again.

### "Categories look random"

* LLM model too small / not following instructions.
* Try a more capable model (e.g. `gpt-4o` instead of `gpt-4o-mini`).
* Or adjust the system prompt in `llm_classify.py` (advanced).

### "Page fetch failed for many URLs"

* Some sites block bots. This is expected.
* Failed fetches fall back to using just the bookmark title for classification.
* Default timeout is 10s. Adjust `FETCH_TIMEOUT` if needed.

### "Backend crashed mid-task"

* Tasks are in-memory; a restart loses them.
* Click **"⚠️ Reset"** in the popup to clean up local state, then start over.
* For durability, see "Production Deployment" above for systemd/Docker.

---

## API Reference

### `POST /api/organize/start`

Start a new organize task.

**Request body**:

```json
{
  "github_token": "ghp_xxxxxxxxxxxx",
  "gist_id": "abc123def456",
  "gist_filename": "bookmarks.json"
}
```

**Response** (200 OK):

```json
{
  "task_id": "uuid-string-here",
  "status": "running"
}
```

### `GET /api/organize/{task_id}/status`

Poll task progress.

**Response**:

```json
{
  "task_id": "uuid-string-here",
  "status": "running",          // running | completed | failed
  "progress": {
    "total": 247,
    "processed": 120,
    "current_step": "classifying batch 6/13"
  },
  "started_at": "2026-06-23T10:30:00Z",
  "finished_at": null
}
```

### `GET /api/organize/{task_id}/result`

Fetch final result (only valid after `status == "completed"`).

**Response**:

```json
{
  "task_id": "uuid-string-here",
  "status": "completed",
  "categories": {
    "技术开发": 42,
    "AI 工具": 18,
    "学习教育": 23,
    ...
  },
  "total_bookmarks": 247,
  "duration_seconds": 45.2
}
```

### `GET /api/health`

Liveness check.

**Response**:

```json
{"status": "ok"}
```

---

## FAQ

**Q: Does the extension call the LLM directly?**
A: No. The extension only talks to your backend, which then calls the LLM. This is by design — your Gist Token never leaves your machine.

**Q: Can I use multiple LLM providers?**
A: Yes — any OpenAI-compatible endpoint. Just set `LLM_BASE_URL` and `LLM_MODEL`.

**Q: How long does organizing ~250 bookmarks take?**
A: Typically 30-90 seconds, depending on LLM latency and page-fetch concurrency.

**Q: What happens to bookmarks that can't be fetched?**
A: They fall back to using just the bookmark title for classification. If even the title is empty, they're put in "其他".

**Q: Can I undo an organize?**
A: The original Gist content is overwritten, but your browser still has the pre-organize bookmarks locally. Just **don't** click "Download Bookmarks" in the result modal, and your local bookmarks are unchanged. (Or re-upload the pre-organize version from your browser.)

**Q: How do I customize the 10 categories?**
A: Edit `llm_classify.py` `SYSTEM_PROMPT` and the `ALLOWED_CATEGORIES` list. Also update the extension's `src/utils/setting.ts` if you want to change the displayed category names.

**Q: Does the backend log my bookmarks?**
A: By default, no PII is logged. Only counts and category names. Set `LOG_LEVEL=WARNING` to suppress everything except errors.

**Q: How do I update to a newer version?**
A: `git pull` then `pip install -r requirements.txt --upgrade`. Restart the service.

---

## See Also

* [Main README](../README.md)
* [简体中文 README](../README_cn.md)
* [GitHub Issues](https://github.com/dudor/BookmarkHub/issues)