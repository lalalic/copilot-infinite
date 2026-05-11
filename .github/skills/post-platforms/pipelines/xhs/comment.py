#!/usr/bin/env python3
"""
Add a comment or reply on a XiaoHongShu post.

Usage:
  python3 comment.py --url https://www.xiaohongshu.com/explore/xxx --text "好棒!"
  python3 comment.py --url https://www.xiaohongshu.com/explore/xxx --text "同意!" --reply-to "原评论文字"
"""
import argparse, json, os, sys, subprocess, tempfile

BH_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_comment_bh.py")
MAX_LEN = 500

def main():
    p = argparse.ArgumentParser(description="Add comment or reply on XiaoHongShu post")
    p.add_argument("--url", required=True, help="XHS post URL (xiaohongshu.com/explore/xxx)")
    p.add_argument("--text", required=True, help=f"Comment text (max {MAX_LEN} chars)")
    p.add_argument("--reply-to", default="", help="Text of comment to reply to (substring match)")
    args = p.parse_args()

    if len(args.text) > MAX_LEN:
        sys.exit(f"Comment too long: {len(args.text)} chars (max {MAX_LEN})")

    cfg = {"url": args.url, "text": args.text, "reply_to": args.reply_to}
    cfg_f = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(cfg, cfg_f, ensure_ascii=False); cfg_f.close()

    with open(BH_SCRIPT) as f:
        code = f.read().replace("__CFG_PATH__", cfg_f.name)
    try:
        r = subprocess.run(["browser-harness", "-c", code], timeout=120)
        sys.exit(r.returncode)
    finally:
        os.unlink(cfg_f.name)

if __name__ == "__main__":
    main()
