// uploader/YouTubeUploader.js
const BaseUploader = require('./base-uploader');

module.exports=class youtube extends BaseUploader {
    static titleLen=100
    static descLen=5000
    static baseURL="https://studio.youtube.com"

    async cookies(){
        const domains=["youtube.com","google"]
        const all=await this.context.cookies()
        const cookies=all.filter(a=>domains.some(domain=>a.domain.includes(domain)))
        return cookies
    }

    async upload(page) {
        this.log("Clicking upload videos button...");
        await page.locator('button[aria-label="Upload videos"],ytcp-icon-button[aria-label="Upload videos"]').click(),
        
        this.log(`Uploading video file: ${this.video.filePath}`);
        await page.locator('input[type=file][name*=Filedata]').uploadFile(this.video.filePath);

        this.log("Filling video title...");
        await page.locator('[role=textbox][aria-label*="Add a title that describes"]').click();
        await page.locator('[role=textbox][aria-label*="Add a title that describes"]').fill(this.video.title);

        this.log("Filling video description...");
        await page.locator('[role=textbox][aria-label*="Tell viewers about your video"]').click();
        await page.locator('[role=textbox][aria-label*="Tell viewers about your video"]').fill(this.video.description);

        if(this.video.cover){
            this.log(`Uploading video cover: ${this.video.cover}`);
            await page.locator('input#file-loader.ytcp-thumbnail-uploader[accept*=image][type=file]').uploadFile(this.video.cover)
            await page.waitForSelector('button#preview-button.ytcp-thumbnail-editor img#img-with-fallback')
        }

        this.log("Waiting for YouTube checks to complete...");
        await page.waitForSelector("::-p-text(Checks complete. No issues found.)",{timeout: this.timeout})

        this.log("Setting video as not made for kids...");
        await page.locator(`tp-yt-paper-radio-button[name=VIDEO_MADE_FOR_KIDS_NOT_MFK]`).click();
        await page.waitForSelector(`tp-yt-paper-radio-button[name=VIDEO_MADE_FOR_KIDS_NOT_MFK][checked]`);

        this.log("Clicking Next (details)...");
        await page.locator('button[aria-label=Next]').click();

        await this.wait()
        this.log("Clicking Next (video elements)...");
        await page.locator('button[aria-label=Next]').click();

        await this.wait()
        this.log("Clicking Next (checks)...");
        await page.locator('button[aria-label=Next]').click();

        await this.wait()
        this.log("Setting video visibility to Public...");
        await page.locator('tp-yt-paper-radio-button[name=PUBLIC]').click();

        this.log("Waiting for YouTube checks to complete (final)...");
        await page.waitForSelector("::-p-text(Checks complete. No issues found.)",{timeout: this.timeout})

        this.log("Publishing video...");
        await page.locator('button[aria-label=Publish]').click();

        this.log("Waiting for publish dialog or processing dialog...");
        await Promise.race([//2 cases
            page.locator('ytcp-video-share-dialog #close-button button[aria-label=Close]').click(),
            page.locator('[role=dialog][aria-label="Video processing"] button[aria-label=Close]').click(),
        ])

        //to get list
        const listUrl=`${page.url()}/videos/upload`
        this.log(`Navigating to uploaded videos list: ${listUrl}`);
        await page.goto(listUrl)

        const posted=await page.locator('ytcp-video-row').waitHandle()
        this.log(`Waiting for posted video to appear: ${this.video.title}`);
        await posted.waitForSelector(`::-p-text(${this.video.title})`)
        const href=await (await posted.waitForSelector('a')).getAttribute('href')
        const [_,id,]=href.split("/").reverse()

        this.video.id=id
        return `https://youtu.be/${id}`
    }

    async cleanup(){
        if(this.video.testing){
            const page=this.page
            const posted = await this.waitForSelector('ytcp-video-row')
            await (await posted.evaluateHandle(el=>Array.from(el.querySelectorAll('ytcp-icon-button')).find(b=>b.getAttribute("aria-label")==="Options"))).click()
            await page.locator('tp-yt-paper-item::-p-text(Delete forever)').click();
            await page.locator('ytcp-confirmation-dialog#delete-dialog #checkbox-container').click();
            await posted.waitForElementState("detached")
            this.log('Test post deleted.');
        }
    }
}
