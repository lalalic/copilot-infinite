#!/usr/bin/env python3
"""
Get stats for XHS/Xiaohongshu posts.

Mode 1 (default): Creator center — shows stats for your own recent posts
  python3 stats.py

Mode 2: Specific note — requires xsec_token from the feed URL
  python3 stats.py --url "https://www.xiaohongshu.com/explore/NOTE_ID?xsec_token=TOKEN"

Uses Playwright + Chrome cookies.
"""
import argparse, json, re, sys, time


def main():
    p = argparse.ArgumentParser(description="Get XHS post stats")
    p.add_argument("--url", help="XHS post URL (with xsec_token). Omit for creator dashboard.")
    args = p.parse_args()

    try:
        from pycookiecheat import chrome_cookies
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("ERROR: pip install pycookiecheat playwright", file=sys.stderr)
        sys.exit(1)

    cookies = chrome_cookies("https://www.xiaohongshu.com")
    if "web_session" not in cookies:
        print("WARNING: No web_session — log in to XHS in Chrome first", file=sys.stderr)

    cookie_list = [
        {"name": n, "value": v, "domain": ".xiaohongshu.com", "path": "/"}
        for n, v in cookies.items()
    ]

    if args.url:
        _fetch_single_note(cookie_list, args.url)
    else:
        _fetch_creator_dashboard(cookie_list)


def _fetch_single_note(cookie_list, url):
    """Fetch stats for a single note (URL must include xsec_token)."""
    from playwright.sync_api import sync_playwright

    captured = {}

    def on_response(resp):
        rurl = resp.url
        if "/api/sns/web/v1/feed" in rurl or "/api/sns/web/v1/note" in rurl:
            try:
                data = resp.json()
                if data.get("data") and data["data"].get("items"):
                    for item in data["data"]["items"]:
                        nc = item.get("note_card", {})
                        interact = nc.get("interact_info", {})
                        user = nc.get("user", {})
                        captured["result"] = {
                            "note_id": nc.get("note_id", item.get("id", "")),
                            "title": (nc.get("title") or nc.get("desc", ""))[:100],
                            "author": user.get("nickname", ""),
                            "likes": int(interact.get("liked_count", 0)),
                            "favorites": int(interact.get("collected_count", 0)),
                            "comments": int(interact.get("comment_count", 0)),
                            "shares": int(interact.get("share_count", 0)),
                            "type": nc.get("type", ""),
                        }
            except Exception:
                pass

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        ctx.add_cookies(cookie_list)
        page = ctx.new_page()
        page.on("response", on_response)
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        time.sleep(5)

        # Try __INITIAL_STATE__ fallback
        if not captured:
            result = page.evaluate(r"""
            () => {
                try {
                    var s = window.__INITIAL_STATE__;
                    if (!s?.note?.noteDetailMap) return null;
                    var m = JSON.parse(JSON.stringify(s.note.noteDetailMap));
                    var k = Object.keys(m).find(x => x!=='undefined'&&x!=='null');
                    if (!k) return null;
                    var n = m[k].note;
                    if (!n?.interactInfo) return null;
                    var i = n.interactInfo;
                    return {
                        note_id: n.noteId||k, title: (n.title||'').substring(0,100),
                        author: (n.user||{}).nickname||'',
                        likes: parseInt(i.likedCount||'0'), favorites: parseInt(i.collectedCount||'0'),
                        comments: parseInt(i.commentCount||'0'), shares: parseInt(i.shareCount||'0'),
                        type: n.type||''
                    };
                } catch(e) { return null; }
            }
            """)
            if result and result.get("note_id") not in (None, "null", "undefined"):
                captured["result"] = result

        browser.close()

    if captured.get("result"):
        print(json.dumps(captured["result"], ensure_ascii=False, indent=2))
    else:
        print("ERROR: Could not fetch stats. XHS requires xsec_token in URL for direct access.", file=sys.stderr)
        print("  Copy the full URL from XHS feed (includes ?xsec_token=...)", file=sys.stderr)
        sys.exit(1)


def _fetch_creator_dashboard(cookie_list):
    """Fetch stats for own posts from creator center dashboard."""
    from playwright.sync_api import sync_playwright

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        ctx.add_cookies(cookie_list)
        page = ctx.new_page()

        page.goto("https://creator.xiaohongshu.com/creator/home", wait_until="domcontentloaded", timeout=15000)
        time.sleep(5)

        # Extract dashboard stats
        result = page.evaluate(r"""
        () => {
            var text = document.body.innerText;
            var stats = {};

            // Extract follower/following counts
            var matches = text.match(/(\d+)\s*关注数/);
            stats.following = matches ? parseInt(matches[1]) : 0;
            matches = text.match(/(\d+)\s*粉丝数/);
            stats.followers = matches ? parseInt(matches[1]) : 0;
            matches = text.match(/(\d+)\s*获赞与收藏/);
            stats.total_likes_favs = matches ? parseInt(matches[1]) : 0;

            // Extract 7-day or 30-day overview stats
            var labels = ['曝光数','观看数','点赞数','评论数','收藏数','分享数','净涨粉'];
            var overview = {};
            for (var label of labels) {
                var re = new RegExp(label + '\\s*(\\d[\\d,]*)');
                var m = text.match(re);
                overview[label] = m ? parseInt(m[1].replace(/,/g, '')) : 0;
            }
            stats.overview = overview;

            return stats;
        }
        """)

        browser.close()

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
