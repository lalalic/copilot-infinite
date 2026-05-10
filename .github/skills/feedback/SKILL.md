---
name: feedback
description: Use this skill when the user wants to add user feedback or
  automatic crash reporting to their app. Provides drop-in client
  implementations (JavaScript/TypeScript and iOS/Swift) that POST to a
  GitHub-issue-creating relay endpoint, hiding the target repo and any
  credentials from end users. Covers auto-report on uncaught exceptions,
  manual "Send feedback" UI, and an anonymous client identity for
  server-side rate limiting.
---

# Feedback skill

Adds a feedback channel to any app. End users can:

- Send manual bug reports / feature requests through an in-app UI
- Have crashes auto-reported (opt-in / opt-out per platform conventions)

Reports become **GitHub issues** in a repo controlled by the app
maintainer — but the end user never sees the repo, never needs a token,
and never installs `gh`.

## Architecture

```
   App  ──HTTPS POST──▶  Relay  ──server-side auth──▶  GitHub Issues API
   │                       │                              │
   │   GH-native body      │  decodes encoded repo,       │  creates issue in
   │   {title,body,labels} │  injects Authorization        │  maintainer's repo
   │   X-Anon-Id header    │  rate-limits per anonId       │
```

Three things travel over the wire:

1. **Endpoint URL** — full URL the app POSTs to. The repo is encoded into
   the URL path, e.g.
   `https://relay.example.com/github/r/<base64url(owner/repo)>/issues`.
   The relay decodes the path segment server-side. End users see only
   the opaque encoded form.

2. **Body** — GitHub-native issue create payload:
   `{ "title": "...", "body": "...", "labels": ["bug", "from:user"] }`.

3. **Headers** — anonymous client identity for rate limiting:
   - `X-Anon-Id` — UUID persisted on the client, never PII
   - `X-App` — e.g. `co-harness`
   - `X-App-Version`

## When to use this skill

- The user is building any app (Electron, web, native iOS/macOS) and
  asks for "feedback", "report a bug", "user reports", "crash
  reporting", "telemetry for issues", etc.
- The user already has a repo where they want issues to land.
- The user does NOT want end users to know about / have access to that
  repo.

If the user does not have a relay running, recommend they deploy
[`copilot-relay`](https://github.com/lalalic/copilot-relay) (its
`/github/*` proxy with the `/r/<enc>/` decoder is what this skill
targets) — or write their own minimal proxy following the wire protocol
above.

## Reference implementations

This skill ships one drop-in client and points to a sibling Swift
package for the other:

- **JS / TypeScript** — [templates/js/](templates/js/)
  Works in Node, Electron (main + preload), and the browser. Includes:
  - `feedback.ts` — `submitFeedback`, `formatExceptionBody`,
    `feedbackTransport`
  - `auto-report.ts` — `getAnonId`, `installCrashHandler` (Node /
    Electron-main), `installBrowserCrashHandler` (renderer / web)
  - `README.md` — integration steps

- **iOS / macOS Swift** — lives in the **`Feedback`** target of the
  [`copilot-ios`](https://github.com/lalalic/copilot-ios) package
  (see `Feedback/Sources/Feedback.swift`,
  `Feedback/Sources/FeedbackView.swift`).
  Add as a Swift Package dependency:

  ```swift
  .product(name: "Feedback", package: "copilot-ios"),
  ```

Both share the wire protocol described above — pick whichever fits the
app and copy / depend on it.

## Workflow

1. **Ask** the user which platform(s) they need: JS / TS / Electron, or
   iOS / macOS, or both.
2. **Ask** for the target GitHub repo (`owner/repo`) — this is **not**
   shipped to end users; it goes only into the maintainer's relay
   config / encoded URL.
3. **Generate the encoded endpoint URL** for them:
   ```sh
   node -e 'const r="OWNER/REPO"; console.log(Buffer.from(r).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""))'
   ```
   Final URL: `https://<their-relay>/github/r/<output>/issues`
4. **Copy the chosen template** into the app's source tree.
5. **Wire up**:
   - Set the endpoint URL as the app's default config (or accept a
     setting).
   - Mount the manual UI (a "Send feedback" button or menu item).
   - Install the crash handler at app startup if auto-report is wanted.
6. **Verify**:
   - Submit a manual test feedback from the running app.
   - Confirm the GitHub issue appears in the repo.
   - Confirm end-user-visible UI never shows the repo, the endpoint, or
     any GitHub-specific terminology.

## Security & privacy contract

- The app **MUST NOT** display the endpoint URL, the decoded repo, or
  any GitHub error text to end users. On failure show a generic
  "Couldn't send feedback right now."
- All traffic **MUST** be HTTPS (templates reject `http://` outside
  `localhost`).
- The `X-Anon-Id` UUID is generated and stored locally; it never
  contains personal info and is used only for the relay's rate limiter.
- Auto-report **MUST** be opt-out (default on) **OR** opt-in
  (default off) per the app's privacy posture — both templates expose
  a setting.
