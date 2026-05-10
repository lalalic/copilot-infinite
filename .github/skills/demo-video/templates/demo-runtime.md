# <App Name> — Demo Manifest

> **Capability declaration consumed by the [`demo-video`](../../../skills/demo-video/SKILL.md)
> skill.** Storyboard authors (LLM or human) read this file to learn
> what the app can demo: which selectors exist, which scenarios
> are pre-canned, which action recipes work.
>
> **Rule of thumb:** if a selector or scenario isn't listed here, the
> storyboard author shouldn't reference it. If you find yourself
> wanting to invent something, update this manifest first.

## Surface

- **type**: `<ios | web | extension>`
- **driver**: `<AppAgent MCP | agent-browser (CDP, port 9222)>`
- **target_url**: `<https://app.example.com/route>` *(web/extension)* OR
  **bundle_id**: `<com.example.app>` *(ios)*
- **load**: `<how to launch — build cmd, MCP URL, --load-extension flag, etc.>`
- **prerequisites**:
  - `<thing the user must do before recording, e.g. "logged in to X">`
  - `<another precondition>`

## Selectors

The storyboard author may ONLY reference selectors that appear here.
To discover refs at runtime, run `agent-browser snapshot --json` (web)
or `app_agent command=snapshot` (iOS) and match by accessible name —
the runtime auto-binds them via `mapRefs`.

| What | Selector |
|---|---|
| `<element role>` | `<#css-selector or @ref-id or [aria-label="…"]>` |
| `<another element>` | `<…>` |

## Scenarios

Pre-canned interaction recordings. Trigger via the events the app
exposes (e.g. `window.dispatchEvent(new CustomEvent('app:replay', {detail:'<name>'}))`
for web, custom URL schemes for iOS, etc.).

Use scenarios when realistic content matters more than literal live
interaction (long transcripts, multi-message conversations, etc.).

| Scenario | What appears | Approx duration |
|---|---|---|
| `<scenario_name>` | `<what the viewer sees>` | `<seconds>` |
| `<another>` | `<…>` | `<…>` |

*(Source of truth lives in `<src/path/to/scenarios.ts>`.)*

## Action recipes

Common interaction patterns expressed as DSL fragments. **Each line
is a literal storyboard DSL line** — storyboard authors drop the
fragment into a step verbatim, no adaptation needed.

### Web / extension example: type a message into chat

```
agent-browser click <selector>
agent-browser keyboard type "<text>"
agent-browser press Enter
```

### Web / extension example: trigger a scenario

```
agent-browser eval window.dispatchEvent(new CustomEvent('app:replay',{detail:'<name>'}))
```

### iOS example: tap a button and type

```
app_agent tap ref=<r-id>
app_agent type ref=<r-id> text="<text>"
```

### iOS example: trigger a scenario via deep link

```
app_agent open_url url="<app-scheme>://demo/<scenario-name>"
```

### `<More recipes as needed>`

```
<DSL fragment>
```

## Recording region *(optional)*

Default: full window. Add this section ONLY if your demos look better
cropped to a sub-region (e.g. a side panel, a modal).

By default the demo-video skill records the full window. To crop the final
clips to `<region name>`, the caller can pass `--crop=<region>`,
which the web adapter resolves at runtime via:

```js
document.querySelector('<root-selector>').getBoundingClientRect()
```

Then converts page rect → screen rect:

- `screen_x = window_x + rect.x`
- `screen_y = window_y + (window_outer_height - window_inner_height) + rect.y`
- `screen_w = rect.width`
- `screen_h = rect.height`

…and ffmpeg crops `demo.mp4` to that rect before writing per-step
clips.
