// uploader/XiaohongshuUploader.js
const BaseUploader = require('./base-uploader');

module.exports=class xiaohongshu extends BaseUploader {
    static titleLen=20
    static descLen=1000
    static baseURL='https://creator.xiaohongshu.com/publish/publish?from=homepage&target=video'

    async upload(page) {
        //OK: upload file
        await page.locator('input.upload-input').uploadFile(this.video.filePath)
        this.log("video file set")
        //@TODO: log progress 
        const uploaded=Promise.race([
            page.waitForSelector("::-p-text(视频解析中),::-p-text(上传中)")
                .then(()=>Promise.race([
                    page.waitForSelector("::-p-text(上传成功)",{timeout:this.timeout}).then(()=>"上传成功"),
                    page.waitForSelector("::-p-text(上传失败)",{timeout:this.timeout}).then(()=>{throw new Error("上传失败")})
                ])),
            page.waitForSelector('::-p-text(未上传)').then(()=>{throw new Error("视频格式或大小不支持")},()=>uploaded)
        ])
        this.log("uploading video file")

        await uploaded

        this.log("uploaded video file")

        //OK
        await page.locator("input[type=text][placeholder=填写标题会有更多赞哦～]").fill(this.video.title);
        await page.$eval('.edit-container', (el, value) => { el.innerHTML = value }, this.video.description);
        this.log("filled title, description")
        //OK
        if(this.video.cover){
            this.log("cover uploading...")
            await page.locator('.cover>div').click();
            await page.waitForSelector('::-p-text(上传图片)')
            await (await page.waitForSelector('.cover-container input[type=file][accept*=image]',{visible:false})).uploadFile(this.video.cover);
            this.log("cover file set")
            await page.locator('button',{text:"确定"}).click();
            await page.waitForSelector('::-p-text(上传图片)',{hidden:true});
            this.log("cover done")
        }

        //OK
        this.log("去声明")
        const sm=await page.waitForSelector('::-p-text(去声明)')
        const disabledSM=await(await page.evaluateHandle(el=>el.classList.contains("disabled"),sm)).jsonValue()
        if(!disabledSM){
            await sm.click();
            await page.locator('div',{text:'我已阅读并同意 《原创声明须知》 ，如滥用声明，平台将驳回并予以相关处置'}).click();
            await page.locator('button',{text:'声明原创'}).click();
        }

        //fail: 内容类型声明/可见
        // await page.locator('div').filter({ hasText: /^内容类型声明0$/ }).locator('path').click();
        this.log("发布")
        await page.locator('button::-p-text(发布)').setWaitForEnabled(true).click();

        this.log("waiting 发布成功")
        await page.waitForSelector('text/发布成功')

        await page.goto("https://creator.xiaohongshu.com/new/note-manager");

        this.log("listing")
        const posted=this.posted=await page.waitForSelector('.content>[data-impression]')
        await posted.waitForSelector(`::-p-text(${this.video.title})`)
        const data=JSON.parse(await posted.evaluate(el=>el.getAttribute("data-impression")))
        this.log("post data got")

        return `https://www.xiaohongshu.com/explore/${data.noteTarget.value.noteId}`
    }

    async cleanup(){
        if(this.video.testing){
            this.log("removing for testing ")
            await (await this.posted.waitForSelector('.control.data-del')).click()
            await this.page.locator('button::-p-text(确定)').click();
            await this.page.waitForSelector("::-p-text(删除成功)")
            this.log("removing clicked ")
            await this.posted.waitForSelector(`::-p-text(${this.video.title})`,{hidden:true})
            this.log("removed ")
        }
    }
}