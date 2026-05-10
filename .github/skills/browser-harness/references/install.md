# browser-harness Setup

## Install CLI (all platforms)

### Prerequisites
- Python 3.10+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) package manager
- Google Chrome or Chromium-based browser

### Install

The repo is cloned into the skill folder as `project/`. Install the CLI globally from there:

```bash
cd <this-skill-folder>/project
uv tool install -e .
```

If the `project/` folder doesn't exist yet, clone it:
```bash
cd <this-skill-folder>
git clone https://github.com/browser-use/browser-harness project
cd project && uv tool install -e .
```

This makes `browser-harness` available globally while pointing at the cloned repo — `git pull` inside `project/` updates the CLI immediately.

Verify: `browser-harness --doctor`

### Platform-specific PATH

The `uv tool install` command puts `browser-harness` on your PATH automatically. If not found:

| Platform | Add to PATH |
|----------|-------------|
| macOS/Linux | `export PATH="$HOME/.local/bin:$PATH"` → add to `~/.zshrc` or `~/.bashrc` |
| Windows | `$env:PATH += ";$HOME\.local\bin"` → add via System Environment Variables |

### Connect to Chrome

**Way 1 — Use your running Chrome (recommended):**
1. In Chrome, go to `chrome://inspect/#remote-debugging`
2. Tick "Allow remote debugging for this browser instance" (one-time per profile)
3. Click Allow on the popup (Chrome 144+)

macOS shortcut to open the inspect page:
```bash
osascript -e 'tell application "Google Chrome" to activate' \
          -e 'tell application "Google Chrome" to open location "chrome://inspect/#remote-debugging"'
```

**Way 2 — Isolated Chrome (no popups, no logins):**
```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-harness

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-harness

# Windows
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 --user-data-dir=$env:TEMP\chrome-harness
```

Then set: `export BU_CDP_URL=http://127.0.0.1:9222` (or `$env:BU_CDP_URL` on Windows)

### Quick test

```bash
browser-harness -c 'print(page_info())'
```

If it prints page info, you're connected.

### Troubleshooting

Run `browser-harness --doctor` and match:

| Symptom | Fix |
|---------|-----|
| chrome FAIL | Open Chrome (Way 1) or launch with flag (Way 2) |
| daemon FAIL | Enable remote debugging checkbox |
| Both ok, still fails | `browser-harness -c 'restart_daemon()'` |
| Daemon hung | Kill: `pkill -f browser_harness.daemon` (macOS/Linux) or `Stop-Process -Name browser_harness.daemon` (Windows). Remove stale socket: `/tmp/bu-default.sock` |

### Keeping current

When `browser-harness` prints `update available`, run:
```bash
browser-harness --update -y
```
