import time, json, re

CFG = json.load(open("__CFG_PATH__"))

print("[1/2] Opening XHS post...")
goto_url(CFG["url"])
wait_for_load()
time.sleep(5)

print("[2/2] Extracting stats...")
stats = js("""
(function(){
    try {
        // Try __INITIAL_STATE__ from SSR
        var scripts = document.querySelectorAll("script");
        var initState = null;
        for (var i = 0; i < scripts.length; i++) {
            var t = scripts[i].textContent || "";
            if (t.indexOf("__INITIAL_STATE__") >= 0) {
                var match = t.match(/__INITIAL_STATE__\\s*=\\s*(.+)/);
                if (match) {
                    // XHS uses decodeURIComponent + JSON.parse
                    var raw = match[1].trim();
                    if (raw.endsWith(";")) raw = raw.slice(0, -1);
                    try { initState = JSON.parse(raw); } catch(e) {
                        try { initState = JSON.parse(decodeURIComponent(raw)); } catch(e2) {}
                    }
                }
                break;
            }
        }
        // Also check window.__INITIAL_STATE__
        if (!initState && window.__INITIAL_STATE__) {
            initState = window.__INITIAL_STATE__;
        }

        if (initState && initState.note && initState.note.noteDetailMap) {
            var keys = Object.keys(initState.note.noteDetailMap);
            if (keys.length > 0) {
                var note = initState.note.noteDetailMap[keys[0]].note;
                var interact = note.interactInfo || {};
                return JSON.stringify({
                    note_id: note.noteId || keys[0],
                    title: (note.title || "").substring(0, 100),
                    author: note.user ? note.user.nickname : "",
                    likes: parseInt(interact.likedCount || "0"),
                    favorites: parseInt(interact.collectedCount || "0"),
                    comments: parseInt(interact.commentCount || "0"),
                    shares: parseInt(interact.shareCount || "0"),
                    type: note.type || "",
                    create_time: note.time || ""
                });
            }
        }

        // DOM fallback
        return JSON.stringify({fallback: true});
    } catch(e) {
        return JSON.stringify({error: e.message});
    }
})()
""")

result = json.loads(stats)
if result.get("fallback") or result.get("error"):
    if result.get("error"):
        print("  SSR parse error:", result["error"])
    print("  Using DOM scrape...")
    likes = js('var el=document.querySelector(".like-wrapper .count, [class*=like] .count");return el?el.textContent.trim():""')
    favorites = js('var el=document.querySelector(".collect-wrapper .count, [class*=collect] .count");return el?el.textContent.trim():""')
    comments = js('var el=document.querySelector(".chat-wrapper .count, [class*=chat] .count");return el?el.textContent.trim():""')
    result = {
        "likes": likes or "N/A",
        "favorites": favorites or "N/A",
        "comments": comments or "N/A"
    }

print(json.dumps(result, ensure_ascii=False, indent=2))
