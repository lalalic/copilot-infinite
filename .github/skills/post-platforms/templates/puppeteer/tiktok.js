// uploader/TikTokUploader.js
const BaseUploader = require('./base-uploader');

module.exports=class tiktok extends BaseUploader {
    static titleLen=0
    static descLen=4000
    static baseURL = "https://www.tiktok.com/tiktokstudio/upload"

    async upload(page) {
        this.log('Waiting for video select button...');
        await page.waitForSelector('button::-p-text(Select video)')
        
        this.log(`Uploading video file: ${this.video.filePath}`);
        await page.locator('input[type=file][accept*=video]').uploadFile(this.video.filePath);

        this.log('Waiting for video to finish uploading...');
        await page.waitForSelector('::-p-text(Uploaded)',{timeout:this.timeout})

        this.log('Accepting copyright and stopping auto-headline...');
        await page.locator('div.copyright-check input[type=checkbox]').click()
        await page.locator('button::-p-text(Stop)').click()
        await Promise.race([
            page.locator('.headline-switch input[type=checkbox]').click(),
            page.waitForSelector('.headline-switch input[type=checkbox][disabled]')
        ])

        await this.wait()
        this.log('Filling in video description...');
        await page.locator('.caption-editor').click();
        await page.locator('.caption-editor [data-text=true]').fill(this.video.description);

        if(this.video.cover){
            this.log(`Uploading cover image: ${this.video.cover}`);
            await page.getByText('Edit cover').click();
            await page.getByText('Upload cover').click();
            await page.locator('input[type=file][accept*=image]').uploadFile(this.video.cover);
            await page.locator('.cover-edit-panel:not(.hide-panel) button::-p-text(Confirm)').setWaitForEnabled(true).click();
        }

        await this.wait()
        this.log('Posting video...');
        await page.locator('button::-p-text(Post)',{exact:true}).setWaitForEnabled(true).click();

        //await page.waitForResponse(res=>res.url().startsWith("https://www.tiktok.com/tiktokstudio/content"))

        this.log('Waiting for post to appear in post table...');
        const posted =await page.waitForSelector('[data-tt=components_PostTable_Container]>[data-tt=components_PostTable_Absolute]')
        await posted.waitForSelector(`::-p-text(${this.video.description})`)

        return page.url()
    }

    async cleanup(){
        if(this.video.testing){
            const page=this.page
            const posted = await this.waitForSelector('[data-tt=components_PostTable_Container]>[data-tt=components_PostTable_Absolute]')
            await (await posted.evaluateHandle(el=>Array.from(el.querySelectorAll('button'))[1])).click()
            await page.getByText('Delete').click();
            await page.locator('button::-p-text(Delete)').click();
            await posted.waitForSelector(`::-p-text(${this.video.description})`,{hidden:true})
            this.log('Test post deleted.');
        }
    }
}