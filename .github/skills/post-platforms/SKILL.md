---
name: post-platforms
description: |
  Use this skill when the user wants to publish a post (typically a short
  video + title + description) to one or more video platforms — YouTube,
  TikTok, Xiaohongshu (RedNote), WeChat Channels, Kindle Direct Publishing.
  The skill ships a vendored, battle-tested set of puppeteer-extra +
  stealth-plugin uploaders (~1500 LoC, 5 platforms) that drive the real
  web UIs — necessary for the platforms that actively detect headless
  browsers. Logins persist via per-platform Chrome profiles. Optional
  one-shot bootstrap copies the user's macOS Chrome default profile so
  they're already logged in on first run. Stage 7 of the Dev Lifecycle
  Orchestrator.
---

# post-platforms

Publishes a finished media asset (typically the demo MP4 produced by
`demo-video` / `repo-marketing`) to one or more end-user platforms.

> **Why a browser-automation skill?** TikTok / Xiaohongshu / WeChat /
> YouTube all have public APIs that are either gated behind paid tiers,
> region-locked, or missing the upload endpoint entirely. The web UIs are
> the only reliable surface — and they actively detect headless browsers.
> Stealth-mode puppeteer is what makes it work in production. This skill
> is intentionally NOT built on `agent-browser` (which targets
> deterministic happy paths on cooperative sites).

## When to invoke

- Maintainer says: "publish the demo to YouTube + TikTok", "post the
  marketing video", "ship to socials".
- Orchestrator (`spec-driven-dev` agent) reaches stage 7 with a
  rendered MP4 ready to ship.
- After `demo-video` or `repo-marketing` produces an MP4 + cover.

## Supported platforms

| Platform | Adapter | Login flow | Notes |
|---|---|---|---|
| YouTube | `templates/puppeteer/youtube.js` | Google OAuth via Chrome | Title + description, scheduled publish supported |
| TikTok | `templates/puppeteer/tiktok.js` | TikTok Studio web | Stealth required; auto-headline disabled |
| Xiaohongshu (RedNote) | `templates/puppeteer/xiaohongshu.js` | Phone OTP | China region |
| WeChat Channels | `templates/puppeteer/wechat.js` | WeChat scan-code | Mainland-only |
| Kindle Direct Publishing | `templates/puppeteer/kindle.js` | Amazon login | Books / shorts |

The `index.js` loops platforms sequentially, one isolated browser per
platform (per-platform `userDataDir`), so a TikTok rate-limit can't
poison a YouTube post.

## Pre-flight (first time per maintainer)

1. **Copy the templates folder** into the host repo:

   ```bash
   cp -r .github/skills/post-platforms/templates/puppeteer ./scripts/post
   cd scripts/post && npm install
   ```

2. **Bootstrap from Chrome (optional, recommended on macOS)** — copies
   the user's logged-in Chrome profile so they don't need to re-login
   from inside puppeteer:

   ```bash
   # QUIT Chrome first.
   bash .github/skills/post-platforms/scripts/bootstrap-from-chrome.sh
   ```

   This populates `~/.qili-media/profiles/<platform>/` with a writable
   copy of `~/Library/Application Support/Google/Chrome/Default`. The
   per-platform isolation keeps a TikTok session out of the YouTube
   profile and vice versa.

   **Skip this step** to log in interactively on first run instead
   (puppeteer launches headed, the user logs in once, the cookie sticks
   in `userDataDir` for next time).

3. **Test post** — pick the lowest-stakes platform (YouTube unlisted,
   or a test TikTok account) and run a dry post with `testing: true`
   in the video object — adapters that support it (TikTok) auto-delete
   the test post after verifying the upload.

## Workflow

When invoked, the skill:

1. **Reads the artifact spec** — `.market/assets/demos/<slug>/clips/`
   for a demo MP4, or asks the user for a path.
2. **Asks the user** which platforms to target (multi-select). Defaults
   to platforms that have an existing `userDataDir` (i.e. previously
   used). Never assume.
3. **Asks for title + description**. If `demo-video`'s storyboard.md
   carries a `## Title` / `## Description` block, pre-fill from there.
4. **Asks for cover image** (optional, recommended for YouTube +
   Xiaohongshu). Falls back to the auto-generated thumbnail.
5. **Confirms** the post plan with `ask_user`:
   ```
   "About to post to: YouTube, TikTok.
    Title: <text>
    Description: <text>
    Cover: <path>
    Headless: false (you'll see the browser).
    Continue? [yes / change / cancel]"
   ```
6. **Runs**:
   ```js
   const { post } = require('./scripts/post');
   const result = await post({
     video: {
       filePath: '/abs/path/demo.mp4',
       title: '...',
       description: '...',
       cover: '/abs/path/cover.jpg',
       testing: false,                     // true = adapters auto-delete after upload
     },
     targets: { youtube: {}, tiktok: {} },
     headless: false,                      // false on first run, true on subsequent
     profilesDir: '~/.qili-media/profiles',
   });
   ```
7. **Reports** the result map (URLs of posted items or `{error}` per
   platform), writes a record to `.specs/posts/<YYYY-MM-DD>-<slug>.md`
   so the orchestrator's stage 8 (post-monitor) can correlate engagement
   data later.

## Output

```
.specs/posts/2026-05-08-zero-to-letter.md

# Post: Zero to Letter (`zero-to-letter`)
**Date:** 2026-05-08
**Asset:** .market/assets/demos/zero-to-letter/clips/demo.mp4
**Title:** "From idea to insurance letter in 30 seconds"

| Platform | URL | Status |
|---|---|---|
| YouTube | https://youtu.be/abc123 | ✅ |
| TikTok | https://www.tiktok.com/@me/video/789 | ✅ |
| Xiaohongshu | — | ❌ login expired, skipped |
```

## Guardrails

- **Default to non-headless on first run.** Users need to see what's
  happening on real platforms.
- **Always confirm before posting.** No autopilot — every post is a
  separate `ask_user` confirm.
- **Respect rate limits.** Sequential per-platform, never parallel.
- **No retry storms.** If an adapter fails, skip it and report —
  don't retry blindly (the platforms will rate-limit harder).
- **Never store credentials.** All auth lives in the per-platform
  Chrome `userDataDir`. The skill itself reads no API keys.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `need login` and then timeout | Run with `headless:false` once and log in; `userDataDir` will keep the cookie |
| TikTok "Stop" button not found | TikTok updated their UI; check `templates/puppeteer/tiktok.js` selectors |
| Upload stalls at "Uploading…" | Increase `protocolTimeout` in `browserOpt`; large files need ≥120s |
| Bootstrap script: "Chrome locked" | Quit Chrome first (`Cmd+Q`), then re-run |
| Bootstrap script: cookies don't decrypt on copy target | The Keychain key is per-Mac per-user; bootstrap only works on the same Mac as your live Chrome |

## Related skills / agents

- [`demo-video`](../demo-video/SKILL.md) — produces the MP4 this skill
  consumes.
- [`repo-marketing`](../repo-marketing/SKILL.md) — produces the
  storyboard / title / description.
- [`post-monitor`](../post-monitor/SKILL.md) (stage 8) — reads
  `.specs/posts/` and correlates with engagement data.
- [`spec-driven-dev`](../../agents/spec-driven-dev.agent.md) (stage 7)
  — the orchestrator that routes to this skill after stage 6 marketing.
- [`agent-browser`](../agent-browser/SKILL.md) — different tool. Use
  for cooperative-site demos / E2E tests; not appropriate for hostile
  anti-bot platforms.

## Provenance

The 5 platform adapters (`youtube.js`, `tiktok.js`, `xiaohongshu.js`,
`wechat.js`, `kindle.js`) plus `base.js` / `base-uploader.js` /
`locator.js` are vendored from
[qili-media](https://github.com/lalalic/qili-media)
(`lib/post/`). Only `index.js` was rewritten to drop the qili-media
internal `utils` dependency and to switch from cookie-passing to
`userDataDir` for login persistence.
