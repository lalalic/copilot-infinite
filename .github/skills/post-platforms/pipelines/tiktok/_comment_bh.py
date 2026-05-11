import time, json

CFG = json.load(open("__CFG_PATH__"))

reply_to = CFG.get("reply_to", "")
text = CFG["text"]

print("[1/4] Opening TikTok video...")
goto_url(CFG["url"])
wait_for_load()
time.sleep(5)
url = page_info()["url"]
if "login" in url.lower():
    print("ERROR: Not logged in to TikTok.")
    raise SystemExit(1)

print("[2/4] Opening comment section...")
time.sleep(2)
# TikTok requires clicking the comment button to expand comments
# Use getElementsByTagName to avoid patched querySelector
js('var btns=document.getElementsByTagName("button");for(var i=0;i<btns.length;i++){var a=btns[i].getAttribute("aria-label")||"";if(a.indexOf("comment")>=0&&btns[i].offsetWidth>0){btns[i].click();break}}')
time.sleep(3)

if reply_to:
    print("[2/4] Finding comment to reply to...")
    reply_escaped = json.dumps(reply_to)
    # TikTok uses data-e2e="comment-level-1" for comment text (SPAN),
    # and data-e2e="comment-reply-1" for Reply button (P).
    # Wait for comments to load, then find and click Reply.
    found = False
    for attempt in range(5):
        found = js('var all=document.getElementsByTagName("*");var found=false;for(var i=0;i<all.length;i++){var de=all[i].getAttribute("data-e2e")||"";if(de==="comment-level-1"&&all[i].textContent.indexOf(' + reply_escaped + ')>=0){for(var j=i+1;j<all.length&&j<i+20;j++){var de2=all[j].getAttribute("data-e2e")||"";if(de2==="comment-reply-1"&&all[j].offsetWidth>0){all[j].click();found=true;break}}break}}found')
        if found:
            break
        print(f"  Waiting for comments to load... ({attempt+1}/5)")
        time.sleep(2)
    if not found:
        print("WARNING: Could not find comment matching: " + reply_to)
    time.sleep(2)

print("[3/4] Typing comment...")
# Focus the DraftJS contenteditable and use type_text
js('var els=document.getElementsByTagName("div");for(var i=0;i<els.length;i++){if(els[i].contentEditable==="true"&&els[i].offsetWidth>0&&((els[i].getAttribute("class")||"").indexOf("DraftEditor")>=0||(els[i].getAttribute("class")||"").indexOf("public-Draft")>=0)){els[i].focus();break}}')
time.sleep(0.5)
type_text(text)
time.sleep(1)

print("[4/4] Submitting...")
# Click data-e2e="comment-post" via iteration
js('var els=document.getElementsByTagName("*");for(var i=0;i<els.length;i++){if(els[i].getAttribute&&els[i].getAttribute("data-e2e")==="comment-post"){els[i].click();break}}')
time.sleep(3)

action = "reply" if reply_to else "comment"
print(f"Done! {action.capitalize()} posted on TikTok.")
