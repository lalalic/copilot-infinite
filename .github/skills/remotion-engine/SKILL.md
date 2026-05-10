---
name: remotion-engine
description: 'Render videos from JSON stream trees using Remotion. Compose scenes with 13 built-in components (text animations, device mockups, data viz, particle effects), 4 theme presets, 5 templates with slot-based customization, TTS narration, BGM and SFX. Use when: rendering marketing videos, product demos, social clips, before/after comparisons, or embedding a video player in an app.'
---

# Remotion Engine

Render MP4 videos from declarative JSON "stream trees." Supports themed components,
templates with slot substitution, TTS narration, and background music/SFX.

## When to Use
- Rendering a marketing or demo video from JSON
- Composing scenes with text animations, device mockups, data visualization
- Using a template (product-hero, feature-showcase, before-after, social-clip, demo-walkthrough)
- Embedding a video player in a web app
- Adapting a single video to multiple aspect ratios (16:9, 9:16, 1:1)

## When NOT to Use
- Live video streaming (this is pre-rendered only)
- Video editing (use DaVinci Resolve, Premiere)
- Screen recording (use the `demo-video` skill instead)

## Prerequisites
- Node.js ≥ 18
- ffmpeg (for audio conversion and Remotion rendering)
- Clone the Remotion project to `~/.remotion-engine` if not already present:
  ```bash
  [ -d ~/.remotion-engine ] || git clone https://github.com/lalalic/remotion-engine.git ~/.remotion-engine
  cd ~/.remotion-engine && npm install
  ```
- Run commands below from `~/.remotion-engine`

## Stream Tree JSON Format

Every video is a JSON tree of typed nodes:

```json
{
  "type": "root",
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "children": [
    {
      "type": "audio",
      "src": "assets/bgm/cinematic-epic.mp3",
      "volume": 0.2
    },
    {
      "type": "folder",
      "name": "scene-1",
      "duration": "5s",
      "children": [
        {
          "type": "component",
          "componentName": "AnimatedHeadline",
          "props": { "text": "Hello World", "animation": "fadeUp" }
        }
      ]
    }
  ]
}
```

### Node Types
| Type | Purpose | Key Props |
|------|---------|-----------|
| `root` | Top-level container | `width`, `height`, `fps`, `theme`, `isSeries` |
| `folder` | Scene/group container | `name`, `duration`, `transition` |
| `component` | Built-in component | `componentName`, `props` |
| `audio` | BGM or SFX | `src`, `volume`, `startFrom` |
| `video` | Video clip | `src`, `startFrom` |
| `image` | Static image | `src` |
| `subtitle` | Captions | `src` (VTT file) |

### Transitions (on `folder` nodes)
```json
{ "transition": { "type": "fade", "duration": "0.5s" } }
```
Types: `fade`, `slide-left`, `slide-right`, `slide-up`, `slide-down`, `wipe`, `none`

## Components (13 built-in)

### Text
| Component | Effect | Key Props |
|-----------|--------|-----------|
| `AnimatedHeadline` | Word-by-word kinetic text | `text`, `animation` (fadeUp/fadeDown/slideIn/scaleIn/blur) |
| `TypewriterText` | Typing simulation | `text`, `speed`, `cursor` |
| `GlitchReveal` | Glitch-in text effect | `text`, `intensity`, `color` |

### Media
| Component | Effect | Key Props |
|-----------|--------|-----------|
| `DeviceMockup` | Browser/phone frame | `src`, `device` (browser/phone/tablet), `url` |
| `CursorFlyover` | Animated cursor over image | `src`, `path` (coordinate array) |
| `ComparisonSlider` | Before/after slider | `before`, `after`, `orientation` |

### Data
| Component | Effect | Key Props |
|-----------|--------|-----------|
| `StatCounter` | Animated number counter | `value`, `suffix`, `label` |
| `ProgressBar` | Animated progress bar | `value`, `label`, `color` |

### Atmosphere
| Component | Effect | Key Props |
|-----------|--------|-----------|
| `GradientBackground` | Animated gradient | `colors` (array), `angle`, `speed` |
| `ParticleField` | Floating particles | `count`, `color`, `speed` |
| `LightLeak` | Film light leak overlay | `intensity`, `color` |

### Layout
| Component | Effect | Key Props |
|-----------|--------|-----------|
| `SplitScreen` | Side-by-side layout | `left`, `right`, `ratio` |
| `SpotlightReveal` | Circle-wipe reveal | `src`, `x`, `y`, `radius` |

## Themes (4 presets)

Set `"theme": "<name>"` on the root node:

| Theme | Vibe | Colors |
|-------|------|--------|
| `cinematic` | Dark, epic, dramatic | Dark bg, gold accent |
| `minimal` | Clean, professional | White bg, dark text |
| `neon` | Cyberpunk, energetic | Dark bg, neon pink/cyan |
| `corporate` | Business, trustworthy | Navy bg, teal accent |

Custom themes: pass a theme object instead of a string name.

## Templates (5 built-in)

Templates are pre-built stream trees with `${slot}` placeholders:

```bash
# List available templates
node src/render/cli.mjs templates

# Render with a template
node src/render/cli.mjs render --template product-hero --data data.json --aspect all
```

| Template | Scenes | Slots |
|----------|--------|-------|
| `product-hero` | Hook → Problem → Solution → CTA | `${title}`, `${tagline}`, `${screenshot}`, `${ctaText}` |
| `feature-showcase` | Intro → Feature 1-3 → CTA | `${title}`, `${feature1}`, `${feature2}`, `${feature3}` |
| `before-after` | Before → Transform → After | `${beforeImage}`, `${afterImage}`, `${label}` |
| `social-clip` | Hook → Demo → CTA | `${hookText}`, `${demoVideo}`, `${ctaText}` |
| `demo-walkthrough` | Intro → Steps → Summary | `${title}`, `${step1}`, `${step2}`, `${step3}` |

## CLI

```bash
# Render stream tree JSON to MP4
node src/render/cli.mjs render my-video.json
node src/render/cli.mjs render my-video.json --aspect 9x16
node src/render/cli.mjs render my-video.json --aspect all   # 16x9 + 9x16 + 1x1

# Render with template
node src/render/cli.mjs render --template product-hero --data slots.json

# Preview in Remotion Studio
node src/render/cli.mjs preview my-video.json

# List templates
node src/render/cli.mjs templates
```

## Audio Pipeline

### BGM (Background Music)
- Place MP3 files in `public/assets/bgm/`
- Reference as `"src": "assets/bgm/track.mp3"` with `volume: 0.1-0.3`
- Use the `audio-sourcing` skill to find and download tracks

### SFX (Sound Effects)
- Place MP3 files in `public/assets/sfx/`
- Reference as `"src": "assets/sfx/whoosh.mp3"` with `volume: 0.5-1.0`
- Standard set: transition, impact, whoosh, click, typing

### TTS (Text-to-Speech)
```typescript
import { generateTTS } from './render/tts';
await generateTTS("Hello world", "output.mp3", { voice: "en-US-AriaNeural" });
```

## Procedure

### 1. Create a Video from Scratch

```
1. Decide the story structure (scenes, duration per scene)
2. Pick a theme: cinematic | minimal | neon | corporate
3. Build the stream tree JSON with scenes as folder nodes
4. Add components (AnimatedHeadline, DeviceMockup, etc.)
5. Add BGM audio node at root level (volume 0.2)
6. Add SFX per scene as needed
7. Render: node src/render/cli.mjs render video.json --aspect all
```

### 2. Use a Template

```
1. List templates: node src/render/cli.mjs templates
2. Create a data.json with slot values
3. Render: node src/render/cli.mjs render --template product-hero --data data.json
```

### 3. Embed in an App

```typescript
import { RemotionEngine, builtinComponents, themes } from '@neox/remotion-engine/player';

<RemotionEngine
  streamTree={jsonTree}
  components={builtinComponents}
  theme="cinematic"
/>
```

## Aspect Ratio Adaptation

The engine auto-adapts layout for different ratios:
- **16:9** (1920×1080) — landscape, YouTube, presentations
- **9:16** (1080×1920) — portrait, TikTok, Instagram Reels
- **1:1** (1080×1080) — square, Instagram feed

Use `--aspect all` to render all three from one stream tree.

## Integration with Other Skills

- **repo-marketing**: Generates `video.json` stream trees that this engine renders
- **demo-video**: Captures screenshots/recordings used as component `src` props
- **audio-sourcing**: Finds and downloads BGM/SFX placed in `public/assets/`
