# Prompt: Step 3.5 — demo-cache.md (per-video)

You compile a **per-video demo cache** that lists every demo intent
the script declares, then invokes the `demo-video` skill in **intent mode**
to fill the missing ones.

## Inputs

- `./script.md` (verify hash) — this video's script. Each scene with
  `intent: demo` MUST also declare `demo_intent: "<one user-language sentence>"`.
- `<repo>/.demo-runtime.md` — the app's capability spec. If missing,
  STOP and tell the user to write it (the demo-video skill cannot operate
  without it).
- `../../research.md` (verify hash) — for product context.

## What you produce

Fill the skeleton at `templates/03b-demo-cache.md`. **One block per
unique `demo_intent`** in this video's script. Order matches the
script's scene order.

### Per-entry fields

```
## INTENT <id>
- **intent**: <verbatim sentence from script.md, in user language>
- **scene_ref**: <scene number from script.md, e.g. scene-4>
- **runtime_pattern**: <chat_question_to_answer | caption_to_translation | replay_only | custom>
- **runtime_args**: <key=value, comma-separated, OR a multi-line block>
- **file**: null
- **elapse_s**: null
- **captured_at**: null
- **runtime_hash**: <12-char sha of intent + runtime_pattern + runtime_args>
- **status**: pending
---
```

Use the `id` slug derived from the intent (4-6 words, kebab-case).
Two scenes that share the same intent share the same entry (`scene_ref`
becomes a comma-separated list).

## Pattern selection

Pick `runtime_pattern` from the patterns the runtime declares:

- `chat_question_to_answer` — viewer types a prompt into the chat,
  app replies. Fill `runtime_args` with `prompt="<text user types>"`.
- `caption_to_translation` — viewer clicks a toolbar action against
  the latest caption. Fill `runtime_args` with `toolbar=<emoji>`.
- `replay_only` — pre-canned scenario. Fill `runtime_args` with
  `scenario=<scenario_name>`.
- `custom` — none of the above match. Author the action steps
  inline in `runtime_args` as a YAML-ish block. The demo-video skill will
  refuse and ask for a runtime extension.

Pick the pattern by **what the intent sentence describes**, not by
guessing what looks cool. If the intent says "translate the last
caption", pick `caption_to_translation`. If it says "ask the panel
what I should follow up on", pick `chat_question_to_answer`.

## Front-matter

```yaml
---
from: ./script.md, <repo>/.demo-runtime.md
from_hash: <combined-sha256>
generated_at: <ISO-8601>
step: 3.5-demo-cache
runtime_file: <repo>/.demo-runtime.md
---
```

## After writing the cache

Invoke the demo-video skill in intent mode:

```bash
.github/skills/demo-video/scripts/run-intent.sh \
  --repo=<repo-root> \
  --video-folder=NN-<slug>
```

The demo-video skill captures every entry whose `file` is null, writes the
mp4 to `<repo>/.market/videos/NN-<slug>/cache/<id>.mp4`, and patches
the cache atomically. After it returns, this artifact is **complete**
when every entry has a non-null `file` and `status: ok`.

## Constraints

- **Never invent intents** the script.md did not declare.
- **Never edit a captured entry** unless the script's `demo_intent`
  changed (compare `runtime_hash`).
- **Never reference the global `<repo>/.market/demo-inventory.md`** —
  that file is deprecated. The cache is per-video.
