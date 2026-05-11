import time, json

CFG = json.load(open("__CFG_PATH__"))

reply_to = CFG.get("reply_to", "")
text = CFG["text"]
text_escaped = json.dumps(text)

print("[1/4] Opening YouTube video...")
goto_url(CFG["url"])
wait_for_load()
time.sleep(8)
url = page_info()["url"]
if "accounts.google.com" in url:
    print("ERROR: Not logged in to YouTube.")
    raise SystemExit(1)

print("[2/4] Scrolling to comments...")
# YouTube lazy-loads comments via IntersectionObserver
# First unhide the comments component so Polymer upgrades it
js('var c=document.querySelector("ytd-comments#comments");if(c){c.removeAttribute("disable-upgrade");c.removeAttribute("hidden");c.hidden=false}')
time.sleep(2)

# Force-trigger the continuation item's visibility callback
# This is required because YouTube's IntersectionObserver often doesn't fire
# from programmatic scrolling (the scroll range is too small for it to trigger)
for attempt in range(25):
    threads = js('document.querySelectorAll("ytd-comment-thread-renderer").length')
    if int(threads) > 0:
        break
    # Try triggering any continuation item renderer's onVisible
    js('var conts=document.querySelectorAll("ytd-continuation-item-renderer");for(var i=0;i<conts.length;i++){if(typeof conts[i].onVisible==="function")conts[i].onVisible()}')
    js("window.scrollBy(0, 100)")
    time.sleep(1)
time.sleep(2)

if reply_to:
    print("[2/4] Finding comment to reply to...")
    reply_escaped = json.dumps(reply_to)
    result = "notfound"
    for attempt in range(12):
        result = js('(function(){var threads=document.querySelectorAll("ytd-comment-thread-renderer");for(var i=0;i<threads.length;i++){if(threads[i].textContent.indexOf(' + reply_escaped + ')>=0){var btn=threads[i].querySelector("#reply-button-end button,[aria-label*=Reply],[aria-label*=reply]");if(btn){btn.click();return "found"}}}return "notfound"})()')
        if result == "found":
            break
        if attempt == 0:
            print("  Scrolling to load comments...")
        js("window.scrollBy(0, 200)")
        time.sleep(2)
    if result != "found":
        print("WARNING: Reply target not found, posting as top-level comment.")
        # Scroll back up to find the comment input
        js("window.scrollTo(0, 0)")
        time.sleep(1)
        for i in range(15):
            js("window.scrollBy(0, 100)")
            time.sleep(0.5)
            found = js('document.querySelector("#placeholder-area,#simplebox-placeholder") ? "found" : "wait"')
            if found == "found":
                break
        js('var p=document.querySelector("#placeholder-area,#simplebox-placeholder");if(p)p.click()')
    time.sleep(2)
else:
    # Click comment placeholder to activate
    js('document.querySelector("#placeholder-area,#simplebox-placeholder").click()')
    time.sleep(1)

print("[3/4] Typing comment...")
js('(function(){var box=document.querySelector("#contenteditable-root[contenteditable=true]");if(box){box.focus();box.textContent=' + text_escaped + ';box.dispatchEvent(new Event("input",{bubbles:true}))}})()')
time.sleep(1)

print("[4/4] Submitting...")
js('(function(){var btns=document.querySelectorAll("#submit-button ytd-button-renderer button,#submit-button button");for(var i=0;i<btns.length;i++){if(!btns[i].disabled&&btns[i].offsetWidth>0){btns[i].click();return}}})()')
time.sleep(3)

action = "reply" if reply_to else "comment"
print(f"Done! {action.capitalize()} posted on YouTube.")
