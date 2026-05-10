---
name: feedback-triager
description: |
  Use this skill when the maintainer says "triage feedback", "what
  feedback came in", "process the bug reports", "anything in the
  inbox", or after the Dev Lifecycle Orchestrator hands off to stage 9.
  The skill polls the maintainer's GitHub repo for new issues filed by
  the `feedback` skill (auto-crash-reports + manual user feedback),
  classifies each, asks the maintainer to confirm, then routes
  confirmed bugs / features back to the orchestrator (stage 2 for
  bugs, stage 1 for features). Closes the autopilot loop.
---

# Feedback Triager — Stage 9

The companion to the **`feedback`** skill. While `feedback` lives
inside end-user apps and *produces* GitHub issues, this skill lives on
the maintainer's side and *consumes* them — turning a stream of raw
issue reports into routed work for the Dev Lifecycle Orchestrator.

## When to invoke

- Maintainer asks: "triage feedback", "process the inbox", "what
  came in overnight", "anything new?".
- Daily / weekly trigger from a cron-like setup.
- The `spec-driven-dev` orchestrator agent hands off to stage 9 after
  shipping a feature.

## Pre-flight

1. **`gh` CLI available + authed.** This is a maintainer-side skill;
   `gh auth status` must succeed. If not, stop and ask the maintainer
   to authenticate.
2. **Target repo known.** Either:
   - Read `feedbackRepo` from `~/.co-harness/config.json`, OR
   - Read `FEEDBACK_REPO` env var, OR
   - Ask the maintainer.
3. **`.specs/feedback/` directory** — create if missing. This is where
   you write per-issue triage notes.

## Workflow

### 1. Pull new issues

```sh
gh issue list \
  --repo "$FEEDBACK_REPO" \
  --state open \
  --label bug,enhancement \
  --limit 50 \
  --json number,title,body,labels,createdAt,author,comments,url
```

Filter to issues created since the last triage run. Track the cursor
in `.specs/feedback/last-triage.txt` (ISO timestamp of newest issue
seen on the previous run).

### 2. Classify each issue

For each new issue, classify into one of:

| Class       | Trigger                                                                | Action                                                               |
|-------------|------------------------------------------------------------------------|----------------------------------------------------------------------|
| **bug**     | Has stack trace, reproducible, label `bug`, `from:auto`, or `from:user` w/ "crash"/"error"/"broken" wording | Route to orchestrator stage 2 (implement fix).                       |
| **feature** | Label `enhancement`, body asks for new behavior                        | Route to orchestrator stage 1 (clarify-idea, update mode).           |
| **dup**     | Title / body matches an existing open issue (≥ 0.7 similarity)         | Post a "duplicate of #N" comment, close.                             |
| **noise**   | Empty body, single emoji, obvious spam, profanity-only                 | Close with brief comment.                                            |
| **wait**    | Needs more info from reporter                                          | Post a question, label `awaiting-reporter`, leave open.              |

Use `semantic_search` over the open-issue list to detect dups (cheap
and good enough for ≤ a few hundred issues).

For each issue, write a triage note at
`.specs/feedback/<issue-number>.md`:

```markdown
# #<N> — <title>

- **Class:** bug | feature | dup | noise | wait
- **Author:** @<login>
- **Source:** auto | user | agent  (from labels)
- **Similarity:** <best-match issue # + score, if relevant>
- **Reasoning:** <one paragraph>
- **Proposed action:** <stage to route to / comment to post>
```

### 3. Confirm with maintainer

Use `ask_user` with one consolidated multi-select question per batch:

```
ask_user({
  questions: [{
    header: "triage",
    question: "Triaged N issues. Confirm classifications?",
    options: [
      "Looks good — execute all",
      "Edit row(s) — tell me which",
      "Skip the dup detections this round",
      "Stop, I'll do it manually"
    ],
    multiSelect: false,
  }]
})
```

Surface the rows as a table. If "Edit row(s)", iterate per disputed
issue with a single ask each.

**Never act without confirmation.** This is a write-back step (closes
issues, posts comments) and a routing step (kicks off implementation
work). The maintainer must say go.

### 4. Execute confirmed actions

For each issue:

- **bug** → write a one-liner spec at `.specs/feedback/<N>-spec.md`
  (just the title + body), then **hand off to the
  `spec-driven-dev` orchestrator agent at stage 2** with that file as
  the spec input. Comment on the GH issue: "Triaged → in implementation
  (branch: feat/fix-issue-<N>)". Add label `triaged`.
- **feature** → hand off to `clarify-idea` skill (it auto-detects
  Update mode when `.specs/spec.md` already exists); pass the issue
  body as the seed. Comment:
  "Triaged → spec'ing". Add label `triaged`.
- **dup** → `gh issue comment <N> --body "Duplicate of #<M>."` then
  `gh issue close <N> --reason "not planned"`.
- **noise** → `gh issue close <N> --comment "Closing as off-topic / spam."`.
- **wait** → `gh issue comment <N> --body "<question>"` and
  `gh issue edit <N> --add-label "awaiting-reporter"`.

### 5. Update cursor + report back

- Write the newest issue's `createdAt` timestamp to
  `.specs/feedback/last-triage.txt`.
- Print a one-paragraph summary: "Triaged N issues — X bugs routed to
  impl, Y features routed to spec'ing, Z dups closed, W noise closed,
  V awaiting reporter."
- If there are bugs queued for impl, ask: "Start implementation now or
  later?" — if "now", hand off to the orchestrator; if "later", stop.

## Guardrails

- **Never close an issue without maintainer confirmation.**
- **Never auto-implement without going through the orchestrator's
  stage 2 gates** (specifically: the implement-loop's per-must-have
  test gate). Don't shortcut.
- **Never expose end-user identity** beyond what's already in the
  issue. The `X-Anon-Id` is already opaque, but PII can leak in user
  bug bodies — if you see an email, phone number, or address, redact
  it before pasting into commits / spec notes.
- **Limit gh writes.** Cap at 50 issue mutations per run to avoid
  rate-limit surprises.

## Outputs

- `.specs/feedback/<N>.md` — per-issue triage note
- `.specs/feedback/<N>-spec.md` — informal spec for confirmed bugs
- `.specs/feedback/last-triage.txt` — cursor for next run
- GH issue comments + label changes
- Hand-off into the Dev Lifecycle Orchestrator (stage 1 or 2) for
  confirmed work

## Related

- [`feedback`](../feedback/SKILL.md) — produces the issues this
  skill consumes.
- [`spec-driven-dev` agent](../../agents/spec-driven-dev.agent.md) —
  receives the routed work at stage 1 (features) or stage 2 (bugs).
- [`clarify-idea`](../clarify-idea/SKILL.md) — used for both fresh
  specs and updates to existing ones (auto-detects which mode).
