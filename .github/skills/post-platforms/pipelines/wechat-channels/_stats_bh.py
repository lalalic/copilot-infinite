import time, json

CFG = json.load(open("__CFG_PATH__"))

SB = 'document.querySelector("wujie-app").shadowRoot.querySelector("body")'

print("[1/3] Opening WeChat Channels console...")
goto_url("https://channels.weixin.qq.com/platform/post/list")
wait_for_load()
time.sleep(10)

# Check login
url = page_info()["url"]
if "login" in url.lower():
    print("ERROR: Not logged in to WeChat Channels. Please scan QR code first.")
    raise SystemExit(1)

print("[2/3] Waiting for content...")
# Wait for shadow DOM
for i in range(15):
    sc = js('document.querySelector("wujie-app")?.shadowRoot ? "ok" : "no"')
    if sc == "ok":
        break
    time.sleep(1)
else:
    print("ERROR: Shadow DOM not found.")
    raise SystemExit(1)

time.sleep(3)

print("[3/3] Extracting stats...")

# Get post list from shadow DOM
post_data = js("""
(function(){
    var sb = """ + SB + """;
    if (!sb) return JSON.stringify({error: "shadow body not found"});
    var text = sb.innerText;
    return JSON.stringify({text: text.substring(0, 2000)});
})()
""")
post_result = json.loads(post_data)

# Navigate to stats page
js('var links=document.querySelectorAll("a");for(var i=0;i<links.length;i++){if(links[i].textContent.trim()==="\u89c6\u9891\u6570\u636e"){links[i].click();break}}')
time.sleep(5)

# Wait for shadow DOM update
time.sleep(3)

# Extract stats from shadow DOM
stats_data = js("""
(function(){
    var sb = """ + SB + """;
    if (!sb) return JSON.stringify({error: "shadow body not found"});

    var text = sb.innerText;

    // Parse key metrics from the text
    var stats = {};

    // Look for patterns like "播放0" or "播放123"
    var metrics = [
        ["plays", "播放"],
        ["likes", "赞"],
        ["favorites", "喜欢"],
        ["comments", "评论"],
        ["shares", "分享"],
        ["follows", "关注"]
    ];

    for (var m of metrics) {
        var key = m[0], label = m[1];
        // Match: label followed by a number (allowing commas)
        var re = new RegExp(label + "[\\\\s]*([\\\\d,]+)");
        var match = text.match(re);
        if (match) {
            stats[key] = parseInt(match[1].replace(/,/g, ""));
        } else {
            stats[key] = 0;
        }
    }

    // Get time range
    var timeMatch = text.match(/统计时间[\\s]*(\\d+-\\d+)[\\s]*至[\\s]*(\\d+-\\d+)/);
    if (timeMatch) {
        stats.period = timeMatch[1] + " to " + timeMatch[2];
    }

    return JSON.stringify(stats);
})()
""")

stats = json.loads(stats_data)

# Combine post list info
result = {
    "post_list_summary": post_result.get("text", "")[:200],
    "video_stats": stats
}

print(json.dumps(result, ensure_ascii=False, indent=2))
