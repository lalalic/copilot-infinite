---
name: audio-sourcing
description: 'Find and download royalty-free BGM (background music) and SFX (sound effects) for video projects. Use when: need background music, transition sounds, impact effects, UI sounds, ambient audio for Remotion Engine videos, marketing clips, demo recordings, any video production.'
---

# Audio Sourcing — BGM & SFX

Find and download royalty-free background music (BGM) and sound effects (SFX) for video production. Primary source: [artlist.io](https://artlist.io) via public GraphQL API (no browser, no auth needed).

## When to Use
- Need background music for a Remotion Engine video scene
- Need sound effects (whoosh, impact, click, typing) for transitions
- Building a demo walkthrough that needs ambient audio
- Creating a marketing video with mood-appropriate music

## When NOT to Use
- Generating AI music (use Suno/Udio instead)
- Need royalty-free images (use Unsplash/Pexels)
- Need voice-over (use TTS at `src/render/tts.ts`)

## Prerequisites
- ffmpeg installed (for AAC→MP3 conversion)
- curl available
- No login, API key, or browser required

## CLI Tool (Recommended)

The `artlist-dl.mjs` script handles search → download → convert in one flow:

```bash
# Search
node scripts/artlist-dl.mjs search "whoosh" sfx          # Search SFX
node scripts/artlist-dl.mjs search "cinematic epic" bgm   # Search music

# Download (from search result URL)
node scripts/artlist-dl.mjs grab <trackUrl> <name> [bgm|sfx]
node scripts/artlist-dl.mjs grab https://artlist.io/sfx/track/sci-fi-transitions---powerful-whoosh/81139 whoosh sfx
node scripts/artlist-dl.mjs grab https://artlist.io/royalty-free-music/song/dominion/6000953 dominion bgm

# List current assets
node scripts/artlist-dl.mjs list
```

## GraphQL API (No Auth, No Browser)

artlist.io's search API at `https://search-api.artlist.io/v1/graphql` is fully public.

### Search SFX
```bash
curl -s 'https://search-api.artlist.io/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query":"query SfxList($categoryIds:String!,$page:Float!,$tags:String!,$term:String!,$sortBy:SfxListRequestSortByOptions!){sfxList(categoryIds:$categoryIds,page:$page,tags:$tags,term:$term,sortBy:$sortBy){songs{songId songName artistName durationTime sitePlayableFilePath nameForURL}}}","variables":{"categoryIds":"","page":1,"tags":"","term":"whoosh","sortBy":"STAFF_PICKS"}}'
```

### Search Music
```bash
curl -s 'https://search-api.artlist.io/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query":"query SongList($page:Int!,$songSortType:Int!,$take:Int!,$vocalMenuId:Int!,$searchTerm:String){songList(page:$page,songSortType:$songSortType,take:$take,vocalMenuId:$vocalMenuId,searchTerm:$searchTerm){songs{songId songName artistName duration sitePlayableFilePath nameForURL}}}","variables":{"page":1,"songSortType":0,"take":10,"vocalMenuId":0,"searchTerm":"cinematic epic"}}'
```

### Get Single Track by ID
```bash
# SFX (Int IDs)
curl -s 'https://search-api.artlist.io/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query":"query Sfxs($ids:[Int!]!){sfxs(ids:$ids){songId songName sitePlayableFilePath duration artistName}}","variables":{"ids":[81139]}}'

# Music (String IDs)
curl -s 'https://search-api.artlist.io/v1/graphql' \
  -H 'Content-Type: application/json' \
  -d '{"query":"query Songs($ids:[String!]!){songs(ids:$ids){songId songName sitePlayableFilePath duration artistName}}","variables":{"ids":["6000953"]}}'
```

### Download & Convert
The `sitePlayableFilePath` field is the direct CDN URL (base64-encoded path). Download with curl, convert with ffmpeg:

```bash
curl -sL "${CDN_URL}" -o .tmp/audio.aac
ffmpeg -y -i .tmp/audio.aac -t 3 public/assets/sfx/effect.mp3  # trim to 3s for SFX
ffmpeg -y -i .tmp/audio.aac public/assets/bgm/track.mp3         # full length for BGM
```

## Artlist Site Structure

### URL Patterns
| Type | Pattern | Example |
|------|---------|---------|
| Music browse | `artlist.io/royalty-free-music` | Main music catalog |
| Music search | `artlist.io/royalty-free-music?terms=corporate+upbeat` | Search by keywords |
| Song page | `artlist.io/royalty-free-music/song/{slug}/{id}` | Single track |
| Album page | `artlist.io/royalty-free-music/album/{slug}/{id}` | Album with tracks |
| Artist page | `artlist.io/royalty-free-music/artist/{slug}/{id}` | Artist profile |
| SFX browse | `artlist.io/sfx` | SFX catalog |
| SFX search | `artlist.io/sfx/search?terms=whoosh` | Search SFX |

### Music Moods & Genres (for search terms)
**Moods**: happy, sad, epic, calm, dramatic, inspiring, upbeat, dark, romantic, mysterious, playful, aggressive, melancholy, triumphant, dreamy, tense, nostalgic, energetic, peaceful, funky
**Genres**: cinematic, corporate, electronic, pop, rock, hip-hop, ambient, classical, jazz, folk, lofi, indie, orchestral, acoustic, synthwave, trap, house, dubstep
**Instruments**: piano, guitar, strings, drums, synth, bass, violin, cello, brass, percussion, flute, saxophone

### SFX Categories
**Transitions**: whoosh, swoosh, swipe, slide, wipe
**Impacts**: hit, punch, slam, boom, thud, crash
**UI/Tech**: click, beep, notification, typing, keyboard, pop, snap
**Ambient**: office, city, nature, crowd, rain, wind
**Risers/Downers**: riser, build-up, tension, drop, swell

## Procedure

### 1. Find BGM for a Video Scene

```bash
# 1. Determine mood from scene description, then search:
node scripts/artlist-dl.mjs search "cinematic epic orchestral" bgm

# 2. Pick a track from results and download:
node scripts/artlist-dl.mjs grab https://artlist.io/royalty-free-music/song/dominion/6000953 scene-bgm bgm

# 3. Reference in stream tree JSON:
# { "type": "audio", "src": "assets/bgm/scene-bgm.mp3", "volume": 0.2 }
```

**Mood → Search term mapping:**
- Cinematic intro → `"cinematic epic orchestral"`
- Product demo → `"corporate upbeat technology"`
- Social clip → `"lofi chill ambient"`
- Before/after → `"inspiring uplifting piano"`

### 2. Find SFX for Transitions/Events

```bash
# 1. Map component to SFX type:
#    AnimatedHeadline → impact   |  TypewriterText → typing
#    GlitchReveal → glitch      |  Scene transition → whoosh

# 2. Search:
node scripts/artlist-dl.mjs search "whoosh transition" sfx

# 3. Download:
node scripts/artlist-dl.mjs grab https://artlist.io/sfx/track/.../81139 whoosh sfx
```

### 3. Recommended BGM Per Template

| Template | Mood | Suggested Search |
|----------|------|-----------------|
| product-hero | Epic, confident | `cinematic technology epic` |
| feature-showcase | Clean, professional | `corporate upbeat modern` |
| before-after | Transformative | `inspiring piano build-up` |
| social-clip | Catchy, energetic | `pop upbeat short` |
| demo-walkthrough | Calm, focused | `ambient technology minimal` |

### 4. Essential SFX Set for Remotion Engine

Every project should have these base SFX in `assets/sfx/`:

| File | Use | Search Terms |
|------|-----|-------------|
| `transition.mp3` | Scene transitions | `whoosh transition cinematic` |
| `impact.mp3` | Text reveals, headlines | `impact hit dramatic` |
| `whoosh.mp3` | Slide/wipe transitions | `swoosh fast subtle` |
| `click.mp3` | Cursor clicks, UI | `click pop digital` |
| `typing.mp3` | Typewriter effect | `keyboard typing mechanical` |
| `riser.mp3` | Build tension before reveal | `riser tension cinematic` |
| `glitch.mp3` | Glitch effects | `glitch digital distortion` |

### 5. Wire Audio into Stream Tree

```json
{
  "type": "root",
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "children": [
    {
      "type": "audio",
      "src": "assets/bgm/background.mp3",
      "volume": 0.2,
      "startFrom": 0
    },
    {
      "type": "folder",
      "name": "scene-1",
      "duration": "5s",
      "children": [
        {
          "type": "audio",
          "src": "assets/sfx/impact.mp3",
          "volume": 0.8,
          "startFrom": 0
        },
        {
          "type": "component",
          "componentName": "AnimatedHeadline",
          "props": { "text": "Hello World" }
        }
      ]
    }
  ]
}
```

## Constraints
- **Preview quality**: CDN audio is preview-quality AAC, not full lossless
- **File format**: Convert to MP3 for smaller size (ffmpeg handles this)
- **Volume levels**: BGM should be 0.1-0.3 (background), SFX 0.5-1.0 (foreground)
- **Short SFX** preferred: Under 3 seconds for transitions, under 1 second for clicks

## Free Alternatives (no subscription needed)
If artlist.io is unavailable:
- **Pixabay Music**: https://pixabay.com/music/ (free, no attribution)
- **Freesound.org**: https://freesound.org/ (CC licensed, some require attribution)
- **YouTube Audio Library**: https://studio.youtube.com/channel/UC/music (free for YouTube)
- **Mixkit**: https://mixkit.co/free-sound-effects/ (free SFX)
