# Saved Pipelines

Reusable automation scripts at `~/.browser-harness/pipelines/`.

This is a stable user-level directory that persists across extension updates. Create it on first use: `mkdir -p ~/.browser-harness/pipelines`

Run any script with `--help` to see options.

## Registry

| Script | Platform | Purpose | Status |
|--------|----------|---------|--------|
| `yt-post.py` | YouTube | Upload video + set title/desc/visibility | ✅ Tested |
| `xhs-post.py` | XiaoHongShu | Post image+text, draft or publish | ✅ Tested |
| `bili-post.py` | Bilibili | Upload video + metadata | ⚠️ Login detection only |
| `wechat-post.py` | WeChat MP | Create article draft | ⚠️ Login detection only |

---

## Schemas

### yt-post.py — YouTube Upload

```json
{
  "video": "/path/to/video.mp4",
  "title": "Video Title",
  "desc": "Video description text",
  "visibility": "unlisted"
}
```

| Field | Required | Max Length | Notes |
|-------|----------|-----------|-------|
| `video` | ✅ | — | Local file path. MP4, MOV, AVI, WMV, FLV, MKV. Max 256GB / 12 hours |
| `title` | ✅ | 100 chars | Plain text only, no HTML |
| `desc` | ❌ | 5000 chars | Plain text, newlines allowed |
| `visibility` | ❌ | — | `private` (default), `unlisted`, or `public` |

CLI: `python ~/.browser-harness/pipelines/yt-post.py --video FILE --title TEXT [--desc TEXT] [--private|--unlisted|--public]`

### xhs-post.py — XiaoHongShu Post

```json
{
  "image": "/path/to/image.png",
  "title": "标题",
  "body": "正文内容"
}
```

| Field | Required | Max Length | Notes |
|-------|----------|-----------|-------|
| `image` | ✅ | — | Local file path. JPG/PNG/WEBP. Multiple images: use `--image` multiple times |
| `title` | ✅ | 20 chars | Plain text, CJK counts as 1 char each |
| `body` | ❌ | 1000 chars | Plain text, newlines allowed. Hashtags: `#话题#` |
| `publish` | ❌ | — | Flag. Omit to save as draft (default) |

CLI: `python ~/.browser-harness/pipelines/xhs-post.py --image FILE --title TEXT [--body TEXT] [--publish]`

### bili-post.py — Bilibili Upload

```json
{
  "video": "/path/to/video.mp4",
  "title": "视频标题",
  "desc": "视频简介",
  "tags": "tag1,tag2",
  "cover": "/path/to/cover.jpg"
}
```

| Field | Required | Max Length | Notes |
|-------|----------|-----------|-------|
| `video` | ✅ | — | Local file path. MP4 recommended. Max 8GB free / 32GB premium |
| `title` | ✅ | 80 chars | Plain text |
| `desc` | ❌ | 2000 chars | Plain text |
| `tags` | ❌ | 10 tags | Comma-separated. Each tag max 20 chars |
| `cover` | ❌ | — | JPG/PNG. 16:10 aspect ratio recommended |
| `publish` | ❌ | — | Flag. Omit to save as draft |

CLI: `python ~/.browser-harness/pipelines/bili-post.py --video FILE --title TEXT [--desc TEXT] [--tags TEXT] [--cover FILE] [--publish]`

### wechat-post.py — WeChat MP Article

```json
{
  "title": "文章标题",
  "body": "文章正文（支持HTML）",
  "cover": "/path/to/cover.jpg",
  "author": "作者名"
}
```

| Field | Required | Max Length | Notes |
|-------|----------|-----------|-------|
| `title` | ✅ | 64 chars | Plain text |
| `body` | ✅ | 20000 chars | Supports HTML formatting |
| `cover` | ❌ | — | JPG/PNG. 2.35:1 aspect ratio (900×383 recommended) |
| `author` | ❌ | 16 chars | Shown below title |

CLI: `python ~/.browser-harness/pipelines/wechat-post.py --title TEXT --body TEXT [--cover FILE] [--author TEXT]`

---

## Adding New Pipelines

When a new browser automation succeeds:

1. Create `~/.browser-harness/pipelines/<platform>-<action>.py`
2. Must use JSON data file pattern (see SKILL.md § Auto-save)
3. Must include `argparse` with `--help`
4. Must detect login state and stop early if not authenticated
5. **Document the schema** above with all fields, constraints, and example JSON
6. Add row to the registry table
7. If learned new selectors/gotchas, update domain skill at `~/.browser-harness/domain-skills/<site>/`
