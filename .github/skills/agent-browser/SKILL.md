---
name: agent-browser
description: Browser automation CLI that connects to the user's existing browser via CDP. Use when operating the user's browser, automating multi-step web workflows, verifying UI, or extracting page data. Never launches a new browser — always attaches to the running one.
---

# Agent Browser Skill

Browser automation via the user's existing browser on cdp 64086 using accessibility tree snapshots and ref-based element selection.

## Prerequisites

If `agent-browser` is not installed, install it first:
```bash
npm install -g agent-browser
```

## Why Use This Over Built-in Browser Tool

**Use agent-browser when:**
- Operating the user's existing browser
- Automating multi-step workflows
- Need deterministic element selection
- Performance is critical
- Working with complex SPAs

**Use built-in browser tool when:**
- Need screenshots/PDFs for analysis
- Visual inspection required
- Browser extension integration needed

## Core Rules

1. **Use the user's existing browser** — always use `--auto-connect` to attach to the user's running browser. NEVER launch a new browser instance.
2. **Prefer existing tabs** — use `agent-browser tab list` and switch to an existing tab before opening new ones.
3. **NEVER close the user's browser** — do not close tabs you didn't open.
4. **If the browser can't connect** — ask the user to chrome://inspect/#remote-debugging to enable it.
5. **Test CDP readiness** — run `agent-browser --auto-connect snapshot --cdp 64086` first. If it fails, the browser isn't available.

## Core Workflow

```bash
# 1. Connect to user's browser and snapshot
agent-browser --auto-connect snapshot -i --json

# 2. If auto-connect fails, ask user to enable CDP, then:
agent-browser snapshot -i --json

# 3. Navigate within existing browser
agent-browser open https://example.com
agent-browser wait --load networkidle
agent-browser snapshot -i --json

# 4. Interact via refs
agent-browser click @e2
agent-browser fill @e3 "text"

# 5. Re-snapshot after page changes
agent-browser snapshot -i --json
```

## Key Commands

### Navigation
```bash
agent-browser open <url>
agent-browser back | forward | reload | close
```

### Snapshot (Always use -i --json)
```bash
agent-browser snapshot -i --json          # Interactive elements, JSON output
agent-browser snapshot -i -c -d 5 --json  # + compact, depth limit
agent-browser snapshot -s "#main" -i      # Scope to selector
```

### Interactions (Ref-based)
```bash
agent-browser click @e2
agent-browser fill @e3 "text"
agent-browser type @e3 "text"
agent-browser hover @e4
agent-browser check @e5 | uncheck @e5
agent-browser select @e6 "value"
agent-browser press "Enter"
agent-browser scroll down 500
agent-browser drag @e7 @e8
```

### Get Information
```bash
agent-browser get text @e1 --json
agent-browser get html @e2 --json
agent-browser get value @e3 --json
agent-browser get attr @e4 "href" --json
agent-browser get title --json
agent-browser get url --json
agent-browser get count ".item" --json
```

### Check State
```bash
agent-browser is visible @e2 --json
agent-browser is enabled @e3 --json
agent-browser is checked @e4 --json
```

### Wait
```bash
agent-browser wait @e2                    # Wait for element
agent-browser wait 1000                   # Wait ms
agent-browser wait --text "Welcome"       # Wait for text
agent-browser wait --url "**/dashboard"   # Wait for URL
agent-browser wait --load networkidle     # Wait for network
agent-browser wait --fn "window.ready === true"
```

### Tabs & Frames
```bash
agent-browser tab new https://example.com
agent-browser tab 2                       # Switch to tab
agent-browser frame @e5                   # Switch to iframe
agent-browser frame main                  # Back to main
```

## Snapshot Output Format

```json
{
  "success": true,
  "data": {
    "snapshot": "...",
    "refs": {
      "e1": {"role": "heading", "name": "Example Domain"},
      "e2": {"role": "button", "name": "Submit"},
      "e3": {"role": "textbox", "name": "Email"}
    }
  }
}
```

## Example: Search and Extract

```bash
agent-browser --auto-connect open https://www.google.com
agent-browser snapshot -i --json
# AI identifies search box @e1
agent-browser fill @e1 "AI agents"
agent-browser press Enter
agent-browser wait --load networkidle
agent-browser snapshot -i --json
# AI identifies result refs
agent-browser get text @e3 --json
agent-browser get attr @e4 "href" --json
```
