# Saved Pipelines

Reusable automation scripts bundled at `skills/post-platforms/pipelines/`
and symlinked to `~/.browser-harness/pipelines/`.

```
pipelines/
  youtube/       post.py, comment.py, stats.py, _*_bh.py
  tiktok/        post.py, comment.py, stats.py, _*_bh.py
  xhs/           post.py, comment.py, stats.py, _*_bh.py
  wechat-channels/  post.py, comment.py, stats.py, _*_bh.py
```

Run any script with `--help` to see options.

## Registry

| Script | Platform | Purpose | Status |
|--------|----------|---------|--------|
| `youtube/post.py` | YouTube | Upload video + set title/desc/tags/thumbnail | ✅ Tested |
| `youtube/comment.py` | YouTube | Add comment or reply | ✅ Tested |
| `youtube/stats.py` | YouTube | Get video stats (views/likes/comments) | ✅ Tested |
| `tiktok/post.py` | TikTok | Upload video + caption/tags/visibility | ✅ Tested |
| `tiktok/comment.py` | TikTok | Add comment or reply | ✅ Tested |
| `tiktok/stats.py` | TikTok | Get video stats (views/likes/shares/favorites) | ✅ Tested |
| `xhs/post.py` | XiaoHongShu | Post image+text or video, draft or publish | ✅ Tested |
| `xhs/comment.py` | XiaoHongShu | Add comment or reply | ✅ Tested |
| `xhs/stats.py` | XiaoHongShu | Get post/account stats (Playwright+cookies) | ✅ Tested |
| `wechat-channels/post.py` | WeChat Channels (视频号) | Upload video + desc/title, draft or publish | ✅ Tested |
| `wechat-channels/comment.py` | WeChat Channels (视频号) | Add comment (creator dashboard) | ✅ Tested |
| `wechat-channels/stats.py` | WeChat Channels (视频号) | Get channel/video stats from dashboard | ✅ Tested |

---

## Schemas

### youtube/post.py — YouTube Upload

```json
{
  "video": "/path/to/video.mp4",
  "title": "Video Title",
  "desc": "Video description text",
  "tags": ["tag1", "tag2"],
  "thumbnail": "/path/to/thumb.jpg",
  "vis": "PRIVATE"
}
```

| Field | Required | Limit | Notes |
|-------|----------|-------|-------|
| `video` | ✅ | 256GB / 12h | MP4, MOV, AVI, WMV, FLV, MKV |
| `title` | ✅ | 100 chars | Plain text only, no HTML |
| `desc` | ❌ | 5000 chars | Plain text, newlines allowed |
| `tags` | ❌ | 500 total chars, 30/tag | Comma-separated. Shows under video |
| `thumbnail` | ❌ | 2MB | JPG/PNG. Custom video thumbnail |
| `vis` | ❌ | — | `PRIVATE` (default), `UNLISTED`, or `PUBLIC` |

CLI: `python ~/.browser-harness/pipelines/youtube/post.py --video FILE --title TEXT [--desc TEXT] [--tags "t1,t2"] [--thumbnail FILE] [--private|--unlisted|--public]`

Two files: `post.py` (wrapper) + `_post_bh.py` (browser-harness script)

### xhs/post.py — XiaoHongShu Post (Image or Video)

```json
{
  "mode": "image",
  "images": ["/path/to/img1.png", "/path/to/img2.jpg"],
  "video": "",
  "title": "标题",
  "body": "正文内容",
  "tags": ["旅行", "美食"],
  "action": "draft"
}
```

| Field | Required | Limit | Notes |
|-------|----------|-------|-------|
| `--image` | ✅* | 18 images | JPG/PNG/WEBP. Repeat for multiple. *Mutually exclusive with --video |
| `--video` | ✅* | — | MP4. *Mutually exclusive with --image |
| `--title` | ✅ | 20 chars | CJK counts as 1 char each |
| `--body` | ✅ | 1000 chars | Plain text, newlines allowed |
| `--tags` | ❌ | 5 tags | Comma-separated. Appended as `#tag#` in body |
| `--publish` | ❌ | — | Flag. Omit to save as draft (default) |

CLI (image): `python ~/.browser-harness/pipelines/xhs/post.py --image FILE [--image FILE2] --title TEXT --body TEXT [--tags "旅行,美食"] [--publish]`
CLI (video): `python ~/.browser-harness/pipelines/xhs/post.py --video FILE --title TEXT --body TEXT [--tags "旅行,美食"] [--publish]`

Two files: `post.py` (wrapper) + `_post_bh.py` (browser-harness script)

### tiktok/post.py — TikTok Video Upload

```json
{
  "video": "/path/to/video.mp4",
  "caption": "Check this out! #fyp #viral",
  "cover": "",
  "visibility": "public",
  "allow_comments": true,
  "allow_duets": true,
  "allow_stitch": true
}
```

| Field | Required | Limit | Notes |
|-------|----------|-------|-------|
| `--video` | ✅ | 10GB / 10min | MP4 recommended |
| `--caption` | ✅ | 4000 chars | Including hashtags. Plain text |
| `--tags` | ❌ | 10 tags | Comma-separated. Appended as `#tag` to caption |
| `--cover` | ❌ | — | JPG/PNG. Custom video cover |
| `--visibility` | ❌ | — | `public` (default), `friends`, or `private` |
| `--no-comments` | ❌ | — | Flag. Disable comments |
| `--no-duets` | ❌ | — | Flag. Disable duets |
| `--no-stitch` | ❌ | — | Flag. Disable stitch |

CLI: `python ~/.browser-harness/pipelines/tiktok/post.py --video FILE --caption TEXT [--tags "fyp,viral"] [--cover FILE] [--visibility public|friends|private] [--no-comments] [--no-duets] [--no-stitch]`

Two files: `post.py` (wrapper) + `_post_bh.py` (browser-harness script)

### wechat-channels/post.py — WeChat Channels (视频号) Video Post

```json
{
  "video": "/path/to/video.mp4",
  "desc": "视频描述文本",
  "title": "短标题",
  "tags": ["话题1", "话题2"],
  "publish": false
}
```

| Field | Required | Limit | Notes |
|-------|----------|-------|-------|
| `video` | ✅ | 20GB / 8h | MP4/H.264 |
| `desc` | ✅ | 1000 chars | Plain text. Tags appended as `#话题` |
| `title` | ❌ | 6-16 chars | Short title, shown as overlay on video |
| `tags` | ❌ | — | Comma-separated. Appended to description as `#tag` |
| `publish` | ❌ | — | Flag. Omit/false to save as draft (default) |

**Architecture notes:**
- Page uses **wujie micro-frontend** — form elements are inside `<wujie-app>` shadow DOM
- File upload uses `DOM.performSearch` with `pierce=True` to find `<input type="file">` in shadow DOM
- Buttons are at y:1168 (below viewport 879px), must scroll shadow body before clicking
- Button text matching required (CSS class `.weui-desktop-btn_default` matches 20+ hidden dialog buttons)
- Two files: `post.py` (wrapper) + `_post_bh.py` (browser-harness script)

CLI: `python ~/.browser-harness/pipelines/wechat-channels/post.py --video FILE --desc TEXT [--title TEXT] [--tags "话题1,话题2"] [--publish]`

---

### {platform}/comment.py — Add Comment or Reply

Each platform has its own `comment.py` with platform-specific `--url` and char limits.

```json
{
  "url": "https://www.youtube.com/watch?v=xxx",
  "text": "Great video!",
  "reply_to": ""
}
```

| Field | Required | Limit | Notes |
|-------|----------|-------|-------|
| `--url` | ✅ (YT/TT/XHS) | — | Post/video URL. WeChat defaults to dashboard |
| `--text` | ✅ | Platform-dependent | YT: 10000, TikTok: 150, XHS: 500, WeChat: 500 |
| `--reply-to` | ❌ | — | Substring of existing comment text to reply to. If omitted, posts top-level comment |

**Platform-specific behavior:**
- **YouTube**: Navigates to video, scrolls to comments (removes `disable-upgrade`/`hidden` attrs for lazy-loading), clicks placeholder, types in `#contenteditable-root`, submits via `#submit-button`
- **XHS**: Cannot navigate directly to post URL (requires `xsec_token`). Script navigates to user profile → finds post by ID → clicks card → comments via `#content-textarea` + `button.btn.submit`
- **TikTok**: Direct URL navigation. Must click comment button first (aria-label "Read or add comments") to expand section. Uses DraftJS contenteditable for input, `type_text()` for typing. TikTok patches `querySelector` for anti-bot — all DOM ops use `getElementsByTagName` iteration
- **WeChat Channels**: Uses creator dashboard (no consumer web feed). Navigates to 互动管理→评论 via SPA nav, selects first video (`.comment-feed-wrap`), clicks 写评论 button, types in `textarea.create-input` inside wujie shadow DOM, submits via `div.tag-wrap.primary`

Two files per platform: `comment.py` (wrapper) + `_comment_bh.py` (browser-harness script)

CLI (YouTube): `python ~/.browser-harness/pipelines/youtube/comment.py --url URL --text TEXT`
CLI (TikTok): `python ~/.browser-harness/pipelines/tiktok/comment.py --url URL --text TEXT`
CLI (XHS): `python ~/.browser-harness/pipelines/xhs/comment.py --url URL --text TEXT`
CLI (WeChat): `python ~/.browser-harness/pipelines/wechat-channels/comment.py --text TEXT`

---

## Adding New Pipelines

When a new browser automation succeeds:

1. Create `~/.browser-harness/pipelines/<platform>/<action>.py`
2. Must use JSON data file pattern (see SKILL.md § Auto-save)
3. Must include `argparse` with `--help`
4. Must detect login state and stop early if not authenticated
5. **Document the schema** above with all fields, constraints, and example JSON
6. Add row to the registry table
7. If learned new selectors/gotchas, update domain skill at `~/.browser-harness/domain-skills/<site>/`

---

## Stats Pipeline Schemas

### tiktok/stats.py — TikTok Video Stats

```bash
python stats.py --url "https://www.tiktok.com/@user/video/123"
```

Output JSON:
```json
{
  "video_id": "7626515765516127501",
  "author": "stuffthattalks1",
  "description": "Listen what your body...",
  "views": 11100000,
  "likes": 532700,
  "comments": 4409,
  "shares": 74600,
  "favorites": "71139",
  "create_time": "1775686604"
}
```

Uses `__UNIVERSAL_DATA_FOR_REHYDRATION__` SSR data. No login needed.

### youtube/stats.py — YouTube Video Stats

```bash
python stats.py --url "https://www.youtube.com/watch?v=xyz"
```

Output JSON:
```json
{
  "video_id": "JDcKQyQS3NU",
  "title": "team mate all 16x9",
  "author": "qili2",
  "views": 3,
  "likes": "0",
  "comments": "N/A",
  "duration_seconds": 219,
  "publish_date": "2026-04-26T20:28:50-07:00"
}
```

Uses `ytInitialPlayerResponse.videoDetails`. No login needed for public videos.

### xhs/stats.py — XiaoHongShu Stats

```bash
# Creator dashboard (own account)
uv run --with playwright --with pycookiecheat python stats.py

# Specific note (needs xsec_token in URL)
uv run --with playwright --with pycookiecheat python stats.py --url "URL_WITH_XSEC_TOKEN"
```

Creator dashboard output:
```json
{
  "following": 0,
  "followers": 0,
  "total_likes_favs": 0,
  "overview": {
    "曝光数": 0, "观看数": 0, "点赞数": 0,
    "评论数": 0, "收藏数": 0, "分享数": 0, "净涨粉": 0
  }
}
```

Requires Chrome login to xiaohongshu.com (uses pycookiecheat).
Note: Direct note URLs require `xsec_token` — copy full URL from XHS feed.

### wechat-channels/stats.py — WeChat Channels Stats

```bash
python stats.py
```

Output JSON:
```json
{
  "post_list_summary": "视频管理\n视频 (3)\n合集 (0)...",
  "video_stats": {
    "plays": 1234,
    "likes": 56,
    "favorites": 0,
    "comments": 12,
    "shares": 3,
    "follows": 1,
    "period": "05-03 to 05-09"
  }
}
```

Reads from Data Center page via shadow DOM. Requires active WeChat login in browser-harness.
