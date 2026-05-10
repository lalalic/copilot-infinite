---
from: ./script.md, <repo>/.demo-runtime.md
from_hash: <combined-sha256>
generated_at: <ISO-8601>
step: 3.5-demo-cache
runtime_file: <repo>/.demo-runtime.md
---

# Demo Cache — <video-slug>

> One block per unique demo_intent in this video's script.md.
> Filled by the `demo-video` skill in intent mode (`run-intent.sh`).

## INTENT <intent-slug>
- **intent**: <verbatim sentence from script.md>
- **scene_ref**: scene-N
- **runtime_pattern**: chat_question_to_answer
- **runtime_args**: prompt="<text the user types>"
- **file**: null
- **elapse_s**: null
- **captured_at**: null
- **runtime_hash**: <12-char sha>
- **status**: pending
---
