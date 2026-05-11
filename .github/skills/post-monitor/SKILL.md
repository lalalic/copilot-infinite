---
name: post-monitor
description: |
  Use this skill for "what's broken in production", "weekly digest",
  "monitor the app", "any new errors / crashes", or as a scheduled
  daily / weekly trigger. Pulls error rate, recent crashes, and basic
  usage from the maintainer's GitHub feedback repo (issues from the
  `feedback` skill) and any wired analytics backend (PostHog, Sentry,
  GA4) and produces a single-page digest. Stage 8 of the lifecycle.
---

# Post-Monitor — Stage 8

Daily / weekly health check for shipped apps. The minimal source of
truth is the **`feedback` skill's GitHub repo** — every auto-reported
crash and every user complaint already lands there as an issue.
Optionally enrich with PostHog / Sentry / GA4 if the maintainer wired
those up.

## When to invoke

- Maintainer asks: "weekly digest", "what's broken", "any new
  crashes", "how's the app doing?".
- Daily / weekly cron-like trigger.
- After a release: confirm the new version isn't worse than the old.

## Pre-flight

1. **`gh` available + authed** (for the issues digest).
2. **Repo known** — same resolution rules as `feedback-triager`:
   `feedbackRepo` setting > `FEEDBACK_REPO` env > ask.
3. **Window** — default last 24 h. Override via maintainer's first
   message ("weekly", "since last release", explicit dates).

## Workflow

### 1. Issue health (always available)

```sh
gh issue list \
  --repo "$FEEDBACK_REPO" --state open \
  --limit 200 \
  --json number,title,labels,createdAt,state \
  --search "created:>=<window-start>"
```

Aggregate:

- **New issues**: count by label (`bug`, `enhancement`,
  `from:auto`, `from:user`).
- **Auto-crashes spike?** `from:auto` count this window vs. previous
  window. Flag if > 2× increase.
- **Top error signatures**: parse the `[auto] <Name>: <message>` titles,
  group by `<Name>: <message-up-to-50-chars>`, top 5 by frequency.
- **Stale issues**: open issues with no comment in > 14 days.

### 2. Optional: analytics enrichment

If `~/.co-harness/config.json` (or env) defines any of:

- `POSTHOG_HOST` + `POSTHOG_PROJECT_API_KEY` → pull DAU + funnel + error events.
- `SENTRY_DSN` + `SENTRY_AUTH_TOKEN` → pull release health + crash-free %.
- `GA4_PROPERTY_ID` + `GA4_OAUTH_TOKEN` → pull DAU.

Skip silently if not configured. Each backend gets its own
`fetch_webpage`-or-`run_in_terminal`-driven section in the digest;
do not invent numbers.

### 2b. Platform stats (social media posts)

Pull engagement metrics from social media platforms where the
maintainer publishes content. The pipeline scripts live at
`~/.browser-harness/pipelines/{platform}/stats.py`.

**Auto-detect which platforms are available** by checking if the
pipeline script files exist. Skip silently if a platform dir is
missing.

#### TikTok

```sh
python3 ~/.browser-harness/pipelines/tiktok/stats.py \
  --url "<VIDEO_URL>"
```

Returns JSON: `video_id`, `author`, `description`, `views`, `likes`,
`comments`, `shares`, `favorites`, `create_time`.

Requires a known video URL — read from `.specs/monitoring/posts.json`
(see config below).

#### YouTube

```sh
python3 ~/.browser-harness/pipelines/youtube/stats.py \
  --url "<VIDEO_URL>"
```

Returns JSON: `video_id`, `title`, `author`, `views`, `likes`,
`comments`, `duration_seconds`, `publish_date`.

#### XHS (Xiaohongshu)

Two modes:

```sh
# Creator dashboard — own account overview (no URL needed)
uv run --with playwright --with pycookiecheat \
  python3 ~/.browser-harness/pipelines/xhs/stats.py

# Specific note (requires xsec_token in URL)
uv run --with playwright --with pycookiecheat \
  python3 ~/.browser-harness/pipelines/xhs/stats.py \
  --url "<NOTE_URL_WITH_XSEC_TOKEN>"
```

Returns JSON with likes, favorites, comments, shares, etc.
Requires Chrome login to xiaohongshu.com.

#### WeChat Channels (视频号)

```sh
python3 ~/.browser-harness/pipelines/wechat-channels/stats.py
```

Returns JSON: `post_list_summary`, `video_stats` (plays, likes,
favorites, comments, shares, follows, period).
Requires active WeChat Channels login in browser-harness.

#### Platform config

Maintain a list of tracked posts in `.specs/monitoring/posts.json`:

```json
{
  "tiktok": [
    {"url": "https://www.tiktok.com/@user/video/123", "label": "Campaign A"}
  ],
  "youtube": [
    {"url": "https://www.youtube.com/watch?v=xyz", "label": "Launch video"}
  ],
  "xhs": [],
  "wechat": true
}
```

- If `posts.json` doesn't exist, skip platform stats silently.
- For each entry, run the corresponding stats script, capture JSON.
- `"wechat": true` means pull dashboard stats (no per-post URL).
- `"xhs": []` (empty) means pull creator dashboard only.

### 3. Write the digest

Append to `.specs/monitoring/<YYYY-MM-DD>.md`:

```markdown
# Digest — <date> (window: <start> → <end>)

## Quick read
- New issues: <total> (<n bug>, <n feature>, <n auto>, <n user>)
- Auto-crashes vs previous window: <ratio> (<flag if spiking>)
- Top error: `<signature>` × <n>
- Platform reach: TikTok <views>V / YouTube <views>V / XHS <likes>♡ / WeChat <plays>▶

## Top 5 error signatures
| # | Count | Signature                  | First seen | Latest issue |
|---|-------|----------------------------|------------|--------------|
…

## New user feedback (manual reports)
- #<N> — <title> — @<author>
…

## Stale (>14 d, open)
- #<N> — <title>

## Analytics (if configured)
### PostHog
- DAU (7d): …
- Crash-free %: …
…

## Platform Stats (if configured)
### TikTok
| Post | Views | Likes | Comments | Shares | Favorites |
|------|-------|-------|----------|--------|-----------|
| Campaign A | 11.1M | 532K | 4,409 | 74.6K | 71.1K |

### YouTube
| Post | Views | Likes | Comments |
|------|-------|-------|----------|
| Launch video | 1,234 | 56 | 12 |

### XHS (Creator Dashboard)
- Followers: … | Following: … | Likes+Favs: …
- 7d: Exposure … | Views … | Likes … | Comments … | Shares …

### WeChat Channels
- Plays: … | Likes: … | Comments: … | Shares … | Follows: …
- Period: MM-DD to MM-DD
```

Maintain a running index at `.specs/monitoring/index.md` listing all
prior digests with the headline numbers.

### 4. Surface to maintainer

- Print the **Quick read** + the **Top 5** + **Platform Stats
  summary** as the chat reply.
- Link to the full file path.
- If anything is **flagged** (spike, stale > 30 d, crash-free < 95 %)
  ask:

  ```
  ask_user({
    questions: [{
      header: "monitor-action",
      question: "Spike detected: <X>. Triage now?",
      options: [
        "Yes — run feedback-triager",
        "No — just logged",
        "Show me the affected issues first"
      ],
    }]
  })
  ```

  On "Yes", hand off to the `feedback-triager` skill.

## Guardrails

- **Never modify issues.** This skill is read-only on GitHub. All
  mutations belong to `feedback-triager`.
- **Never invent metrics.** If an analytics backend isn't configured
  or the API call fails, omit that section (don't fill with zeroes).
- **Never spam the maintainer.** One digest per window. If invoked
  multiple times in the same window, reuse the existing file.

## Outputs

- `.specs/monitoring/<date>.md` — the digest
- `.specs/monitoring/index.md` — running list
- Optional handoff into `feedback-triager` if the maintainer says go

## Related

- [`feedback`](../feedback/SKILL.md) — populates the issue stream
  this skill summarizes.
- [`feedback-triager`](../feedback-triager/SKILL.md) — the action
  arm; this skill is the read-only digest arm.
- [`spec-driven-dev` agent](../../agents/spec-driven-dev.agent.md) —
  invokes this skill at stage 8 of the lifecycle.
