import time, json

CFG = json.load(open("__CFG_PATH__"))

print("[1/2] Opening TikTok video...")
goto_url(CFG["url"])
wait_for_load()
time.sleep(5)

print("[2/2] Extracting stats...")
stats = js("""
(function(){
    try {
        var script = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__");
        if (!script) return JSON.stringify({error: "no rehydration data"});
        var data = JSON.parse(script.textContent);
        var detail = data["__DEFAULT_SCOPE__"]["webapp.video-detail"];
        if (!detail || !detail.itemInfo || !detail.itemInfo.itemStruct) {
            return JSON.stringify({error: "no video detail in rehydration data"});
        }
        var item = detail.itemInfo.itemStruct;
        var stats = item.stats || {};
        return JSON.stringify({
            video_id: item.id || "",
            author: item.author ? item.author.uniqueId : "",
            description: (item.desc || "").substring(0, 100),
            views: stats.playCount || 0,
            likes: stats.diggCount || 0,
            comments: stats.commentCount || 0,
            shares: stats.shareCount || 0,
            favorites: stats.collectCount || 0,
            create_time: item.createTime || ""
        });
    } catch(e) {
        return JSON.stringify({error: e.message});
    }
})()
""")

result = json.loads(stats)
if "error" in result:
    # Fallback: try scraping from DOM
    print("  Rehydration failed:", result["error"])
    print("  Trying DOM scrape...")
    views = js('var el=document.querySelector("[data-e2e=\\"browse-video-count\\"]");return el?el.textContent.trim():""')
    likes = js('var el=document.querySelector("[data-e2e=\\"like-count\\"]");return el?el.textContent.trim():""')
    comments = js('var el=document.querySelector("[data-e2e=\\"comment-count\\"]");return el?el.textContent.trim():""')
    shares = js('var el=document.querySelector("[data-e2e=\\"share-count\\"]");return el?el.textContent.trim():""')
    favorites = js('var el=document.querySelector("[data-e2e=\\"undefined-count\\"]");return el?el.textContent.trim():""')
    result = {
        "views": views or "N/A",
        "likes": likes or "N/A",
        "comments": comments or "N/A",
        "shares": shares or "N/A",
        "favorites": favorites or "N/A"
    }

print(json.dumps(result, ensure_ascii=False, indent=2))
