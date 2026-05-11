import time, json, re

CFG = json.load(open("__CFG_PATH__"))

reply_to = CFG.get("reply_to", "")
text = CFG["text"]

# Extract post ID from URL
m = re.search(r'/explore/([a-f0-9]+)', CFG["url"])
post_id = m.group(1) if m else ""

print("[1/4] Navigating to XHS profile...")
goto_url("https://www.xiaohongshu.com/explore")
wait_for_load()
time.sleep(4)
js('var links=document.querySelectorAll("a");for(var i=0;i<links.length;i++){if(links[i].textContent.trim()==="\\u6211"){links[i].click();break}}')
time.sleep(5)
url = page_info()["url"]
if "profile" not in url:
    print("ERROR: Not logged in to XHS or profile not accessible.")
    raise SystemExit(1)

if post_id:
    print(f"[2/4] Finding post {post_id[:8]}...")
    found = js('(function(){var links=document.querySelectorAll("section a.cover");for(var i=0;i<links.length;i++){if(links[i].href.indexOf("' + post_id[:12] + '")>=0){links[i].click();return "found"}}return "notfound"})()')
    if found != "found":
        print(f"ERROR: Post {post_id} not found on profile page.")
        raise SystemExit(1)
else:
    print("[2/4] Opening first post...")
    js('document.querySelector("section a.cover").click()')
time.sleep(5)

if reply_to:
    print("[3/4] Finding comment to reply to...")
    reply_escaped = json.dumps(reply_to)
    js('(function(){var items=document.querySelectorAll(".parent-comment .comment-item");for(var i=0;i<items.length;i++){if(items[i].textContent.indexOf(' + reply_escaped + ')>=0){var btn=items[i].querySelector(".reply.icon-container,.interactions .reply");if(btn){btn.click();break}}}})()')
    time.sleep(2)

# Focus comment input
js('var el=document.querySelector("#content-textarea");if(el){el.focus();el.click()}')
time.sleep(0.5)

print("[3/4] Typing comment...")
type_text(text)
time.sleep(1)

print("[4/4] Submitting...")
js('document.querySelector("button.btn.submit").click()')
time.sleep(3)

action = "reply" if reply_to else "comment"
print(f"Done! {action.capitalize()} posted on XHS.")
