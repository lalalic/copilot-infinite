#!/usr/bin/env python3
"""
Get stats for a YouTube video.

Usage:
  python3 stats.py --url https://www.youtube.com/watch?v=VIDEO_ID
"""
import argparse, json, os, sys, subprocess, tempfile

BH_SCRIPT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_stats_bh.py")

def main():
    p = argparse.ArgumentParser(description="Get YouTube video stats")
    p.add_argument("--url", required=True, help="YouTube video URL")
    args = p.parse_args()

    cfg = {"url": args.url}
    cfg_f = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(cfg, cfg_f, ensure_ascii=False); cfg_f.close()

    with open(BH_SCRIPT) as f:
        code = f.read().replace("__CFG_PATH__", cfg_f.name)
    try:
        r = subprocess.run(["browser-harness", "-c", code], timeout=60)
        sys.exit(r.returncode)
    finally:
        os.unlink(cfg_f.name)

if __name__ == "__main__":
    main()
