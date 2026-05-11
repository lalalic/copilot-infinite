---
name: post-platforms
description: |
  Post content, interact with posts, and monitor stats on social media platforms
  — YouTube, TikTok, Xiaohongshu (RedNote), WeChat Channels (视频号). Covers
  uploading new posts, adding comments/replies, AND pulling engagement stats
  (views, likes, comments, shares). Uses browser-harness pipelines that drive
  real Chrome via CDP. Use when: "post to YouTube", "upload video to TikTok",
  "comment on my XHS post", "reply to a comment", "get stats for my video",
  "how many views on my TikTok", "check my WeChat Channels stats".
---

# post-platforms

Publishes media content and manages interactions on social platforms via
browser-harness CLI pipelines (`~/.browser-harness/pipelines/`).

## When to invoke

- "post/upload to YouTube / TikTok / XHS / WeChat Channels"
- "comment on this post", "reply to a comment"
- Orchestrator reaches stage 7 with a rendered MP4 ready to ship

## Supported platforms & pipelines

| Pipeline | Platform | Purpose |
|----------|----------|---------|
| `youtube/post.py` | YouTube | Upload video + title/desc/tags/thumbnail |
| `youtube/comment.py` | YouTube | Add comment or reply |
| `youtube/stats.py` | YouTube | Get video stats (views/likes/comments) |
| `xhs/post.py` | XiaoHongShu | Post image+text or video |
| `xhs/comment.py` | XiaoHongShu | Add comment or reply |
| `xhs/stats.py` | XiaoHongShu | Get post/account stats |
| `tiktok/post.py` | TikTok | Upload video + caption/tags/visibility |
| `tiktok/comment.py` | TikTok | Add comment or reply |
| `tiktok/stats.py` | TikTok | Get video stats (views/likes/shares) |
| `wechat-channels/post.py` | WeChat Channels | Upload video + desc/title |
| `wechat-channels/comment.py` | WeChat Channels | Add comment (creator dashboard) |
| `wechat-channels/stats.py` | WeChat Channels | Get channel/video stats |

## Field limits (quick reference)

| Platform | Post title | Post body | Comment | Tags |
|----------|-----------|----------|---------|------|
| YouTube | 100 chars | 5000 chars | 10000 chars | 500 total, 30/tag |
| TikTok | — | 4000 chars (caption) | 150 chars | 10 tags |
| XHS | 20 chars | 1000 chars | 500 chars | 5 tags |
| WeChat | 6-16 chars | 1000 chars | 500 chars | — |

## CLI examples

### Posting

```bash
# YouTube
python ~/.browser-harness/pipelines/youtube/post.py --video demo.mp4 --title "My Video" --desc "Description" --tags "tag1,tag2" --public

# XiaoHongShu (image mode)
python ~/.browser-harness/pipelines/xhs/post.py --image photo1.jpg --image photo2.jpg --title "标题" --body "正文" --tags "旅行" --publish

# XiaoHongShu (video mode)
python ~/.browser-harness/pipelines/xhs/post.py --video clip.mp4 --title "标题" --body "正文" --publish

# TikTok
python ~/.browser-harness/pipelines/tiktok/post.py --video clip.mp4 --caption "Check this out!" --tags "fyp,viral" --visibility public

# WeChat Channels
python ~/.browser-harness/pipelines/wechat-channels/post.py --video clip.mp4 --desc "视频描述" --title "短标题" --publish
```

### Commenting

```bash
# YouTube
python ~/.browser-harness/pipelines/youtube/comment.py --url "https://www.youtube.com/watch?v=xxx" --text "Great video!"

# XHS
python ~/.browser-harness/pipelines/xhs/comment.py --url "https://www.xiaohongshu.com/explore/69c273d7..." --text "好棒！"

# TikTok
python ~/.browser-harness/pipelines/tiktok/comment.py --url "https://www.tiktok.com/@user/video/123" --text "Nice!"

# WeChat Channels (creator dashboard, comments on first video)
python ~/.browser-harness/pipelines/wechat-channels/comment.py --text "评论测试"

# Reply to an existing comment
python ~/.browser-harness/pipelines/youtube/comment.py --url URL --text "I agree!" --reply-to "original comment text"
```

### Stats / Monitoring

```bash
# TikTok — requires video URL
python ~/.browser-harness/pipelines/tiktok/stats.py --url "https://www.tiktok.com/@user/video/123"

# YouTube — requires video URL
python ~/.browser-harness/pipelines/youtube/stats.py --url "https://www.youtube.com/watch?v=xyz"

# XHS — creator dashboard (own account, no URL needed)
uv run --with playwright --with pycookiecheat python ~/.browser-harness/pipelines/xhs/stats.py
# XHS — specific note (needs xsec_token in URL)
uv run --with playwright --with pycookiecheat python ~/.browser-harness/pipelines/xhs/stats.py --url "URL_WITH_XSEC_TOKEN"

# WeChat Channels — dashboard stats
python ~/.browser-harness/pipelines/wechat-channels/stats.py
```

## Prerequisites

- **browser-harness** installed: `cd .github/skills/browser-harness/project && uv tool install -e .`
- **Chrome** running with user logged in to target platforms
- **PATH**: `export PATH="$HOME/.local/bin:$PATH"`

## Setup (first-time)

Pipeline scripts are bundled with this extension at
`skills/post-platforms/pipelines/`. On first use, symlink them into
the standard location so both the skill and direct CLI usage work:

```bash
# Find the extension dir (adjust version as needed)
EXT_DIR="$(find ~/.vscode/extensions -maxdepth 1 -name 'local.copilot-infinite-*' | head -1)"
# Symlink to ~/.browser-harness/pipelines
mkdir -p ~/.browser-harness
ln -sfn "$EXT_DIR/skills/post-platforms/pipelines" ~/.browser-harness/pipelines
```

After this, scripts are accessible both ways:
- Via the bundled extension path: `$EXT_DIR/skills/post-platforms/pipelines/youtube/stats.py`
- Via the standard location: `~/.browser-harness/pipelines/youtube/stats.py`

## Architecture

Pipeline scripts are bundled at `skills/post-platforms/pipelines/`:
```
pipelines/
  youtube/       post.py, comment.py, stats.py + _*_bh.py scripts
  tiktok/        post.py, comment.py, stats.py + _*_bh.py scripts
  xhs/           post.py, comment.py, stats.py + _*_bh.py scripts
  wechat-channels/  post.py, comment.py, stats.py + _*_bh.py scripts
```

Each pipeline uses a two-file pattern:
- `<action>.py` — argparse wrapper with validation, writes JSON config to tempfile
- `_<action>_bh.py` — browser-harness script using `__CFG_PATH__` placeholder

The wrapper reads the BH script, replaces `__CFG_PATH__` with the temp config path,
then runs `subprocess.run(["browser-harness", "-c", code])`.

## Platform-specific notes

- **XHS**: Anti-bot measures — uses `type_text()` instead of `textContent`, buttons via `.click()`, unicode escapes for Chinese text. Post URLs require `xsec_token` (generated per session), so the comment pipeline navigates via profile page instead of direct URL
- **YouTube**: Comments lazy-load via IntersectionObserver. Script handles `disable-upgrade` attribute on `ytd-comments`. Uses `contenteditable` `#contenteditable-root` for input
- **WeChat Channels**: Uses wujie micro-frontend shadow DOM. Elements inside `<wujie-app>` shadow root. File upload via `DOM.performSearch(pierce=True)`
- **TikTok**: Creator center at `tiktok.com/creator#/upload`. DraftJS-style contenteditable for captions. TikTok patches `querySelector` for anti-bot — use `getElementsByTagName` iteration in comment scripts

## Full schemas

See `browser-harness/references/pipelines.md` for complete JSON schemas, field limits, and detailed architecture notes for each pipeline.
