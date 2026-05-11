import time, json

CFG = json.load(open("__CFG_PATH__"))

reply_to = CFG.get("reply_to", "")
text = CFG["text"]

SB = 'document.querySelector("wujie-app").shadowRoot.querySelector("body")'

print("[1/4] Opening WeChat Channels...")
goto_url(CFG["url"])
wait_for_load()
time.sleep(5)

print("[2/4] Navigating to comment management...")
# Must use SPA navigation — direct URLs redirect to dashboard home
# Click 互动管理 to expand, then 评论
js('var links=document.querySelectorAll(".finder-ui-desktop-menu__link");for(var i=0;i<links.length;i++){if(links[i].textContent.trim().indexOf("\\u4e92\\u52a8\\u7ba1\\u7406")>=0&&links[i].offsetWidth>0){links[i].click();break}}')
time.sleep(1)
js('var links=document.querySelectorAll(".finder-ui-desktop-menu__link");for(var i=0;i<links.length;i++){if(links[i].textContent.trim()==="\\u8bc4\\u8bba"&&links[i].offsetWidth>0){links[i].click();break}}')
time.sleep(5)

# Wait for shadow DOM
for i in range(10):
    sc = js('document.querySelector("wujie-app")?.shadowRoot ? "ok" : "no"')
    if sc == "ok":
        break
    time.sleep(1)
else:
    print("ERROR: Shadow DOM not found.")
    raise SystemExit(1)

# Click the first video in the list (match by comment-feed-wrap class)
js('var sb=' + SB + ';var items=sb.querySelectorAll(".comment-feed-wrap");if(items.length>0){items[0].click()}')
time.sleep(3)

if reply_to:
    print("[3/4] Finding comment to reply to...")
    reply_escaped = json.dumps(reply_to)
    # Find .comment-item containing .comment-content matching reply_to,
    # then click the .action-item with text "回复" inside it
    found = js('var sb=' + SB + ';var items=sb.querySelectorAll(".comment-item");var found=false;for(var i=0;i<items.length;i++){var cc=items[i].querySelector(".comment-content");if(cc&&cc.textContent.indexOf(' + reply_escaped + ')>=0){var acts=items[i].querySelectorAll(".action-item");for(var j=0;j<acts.length;j++){if(acts[j].textContent.trim()==="\u56de\u590d"){acts[j].click();found=true;break}}break}}found')
    if not found:
        print("WARNING: Could not find comment matching: " + reply_to)
    time.sleep(2)
else:
    # Click 写评论 button to open comment form
    js('var sb=' + SB + ';sb.querySelectorAll("button,span,div").forEach(function(b){if(b.textContent.trim()==="\\u5199\\u8bc4\\u8bba"&&b.offsetWidth>0){b.click()}})')
    time.sleep(2)

print("[3/4] Typing comment...")
# Focus the textarea.create-input and use type_text
js('var sb=' + SB + ';var ta=sb.querySelector("textarea.create-input");if(ta){ta.value="";ta.focus()}')
time.sleep(0.5)
type_text(text)
time.sleep(1)

print("[4/4] Submitting...")
# Click the 评论 div with class tag-wrap primary
js('var sb=' + SB + ';sb.querySelectorAll("div").forEach(function(e){if(e.textContent.trim()==="\\u8bc4\\u8bba"&&(e.getAttribute("class")||"").indexOf("primary")>=0&&e.offsetWidth>0){e.click()}})')
time.sleep(3)

action = "reply" if reply_to else "comment"
print(f"Done! {action.capitalize()} posted on WeChat Channels.")
