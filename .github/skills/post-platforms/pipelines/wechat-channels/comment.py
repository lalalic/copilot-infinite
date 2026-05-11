#!/usr/bin/env python3
"""
Add a comment on a WeChat Channels (视频号) video via creator dashboard.

Note: WeChat Channels has no consumer web feed. Comments are posted from the
creator dashboard's comment management section (互动管理→评论). The comment
goes to the first video in the list.

Usage:
  python3 comment.py --url https://channels.weixin.qq.com/platform --text "评论测试"
  python3 comment.py --url https://channels.weixin.qq.com/platform --text "回复测试" --reply-to "原评论文字"
"""
import argparse, json, os, sys, subprocess, tempfile

BH_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_comment_bh.py")
MAX_LEN = 500

def main():
    p = argparse.ArgumentParser(description="Add comment on WeChat Channels video")
    p.add_argument("--url", default="https://channels.weixin.qq.com/platform",
                   help="WeChat Channels dashboard URL (default: channels.weixin.qq.com/platform)")
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
