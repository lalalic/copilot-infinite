import time, json

CFG = json.load(open("__CFG_PATH__"))

print("[1/2] Opening YouTube video...")
goto_url(CFG["url"])
wait_for_load()
time.sleep(5)

print("[2/2] Extracting stats...")
stats = js("""
(function(){
    try {
        // ytInitialData has video details
        var vd = ytInitialPlayerResponse && ytInitialPlayerResponse.videoDetails;
        if (!vd) return JSON.stringify({error: "no videoDetails in ytInitialPlayerResponse"});

        var views = vd.viewCount || "0";
        var title = vd.title || "";
        var author = vd.author || "";
        var length = vd.lengthSeconds || "0";

        // Get likes from ytInitialData (engagement panel or like button)
        var likes = "N/A";
        var comments = "N/A";
        try {
            var contents = ytInitialData.contents.twoColumnWatchNextResults.results.results.contents;
            for (var i = 0; i < contents.length; i++) {
                var vp = contents[i].videoPrimaryInfoRenderer;
                if (vp) {
                    // Likes — in the menu renderer
                    var btns = vp.videoActions && vp.videoActions.menuRenderer && vp.videoActions.menuRenderer.topLevelButtons;
                    if (btns) {
                        for (var j = 0; j < btns.length; j++) {
                            var seg = btns[j].segmentedLikeDislikeButtonViewModel;
                            if (seg && seg.likeButtonViewModel && seg.likeButtonViewModel.likeButtonViewModel) {
                                var tb = seg.likeButtonViewModel.likeButtonViewModel.toggleButtonViewModel;
                                if (tb && tb.toggleButtonViewModel && tb.toggleButtonViewModel.defaultButtonViewModel) {
                                    likes = tb.toggleButtonViewModel.defaultButtonViewModel.buttonViewModel.title || likes;
                                }
                            }
                        }
                    }
                }
                // Comments section
                if (contents[i].itemSectionRenderer && contents[i].itemSectionRenderer.sectionIdentifier === "comment-item-section") {
                    var header = contents[i].itemSectionRenderer.header;
                    if (header && header.commentsEntryPointHeaderRenderer) {
                        var ct = header.commentsEntryPointHeaderRenderer.commentCount;
                        if (ct && ct.simpleText) comments = ct.simpleText;
                    }
                }
            }
        } catch(e) {}

        return JSON.stringify({
            video_id: vd.videoId || "",
            title: title.substring(0, 100),
            author: author,
            views: parseInt(views),
            likes: likes,
            comments: comments,
            duration_seconds: parseInt(length),
            publish_date: (ytInitialPlayerResponse.microformat && ytInitialPlayerResponse.microformat.playerMicroformatRenderer && ytInitialPlayerResponse.microformat.playerMicroformatRenderer.publishDate) || ""
        });
    } catch(e) {
        return JSON.stringify({error: e.message});
    }
})()
""")

result = json.loads(stats)
if "error" in result:
    print("  Error:", result["error"])
    print("  Trying DOM fallback...")
    views = js('var el=document.querySelector("ytd-video-primary-info-renderer .view-count, #info-container .view-count");return el?el.textContent.trim():""')
    result = {"views": views or "N/A"}

print(json.dumps(result, ensure_ascii=False, indent=2))
