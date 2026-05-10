// uploader/YouTubeUploader.js
const BaseUploader = require('./base-uploader');
const {tmpFolder, handleExecError}=require("../utils")

module.exports=class wechat extends BaseUploader {
    static titleLen=16//min:6
    static descLen=1000
    static baseURL = "https://channels.weixin.qq.com/platform/post/create"
    static checkLoginSelector='.input-editor'
    constructor(...args){
        super(...args)
        this.app='wujie-app'
    }

    strict(){
        const video=super.strict(...arguments)
        video.title=video.title.padEnd(6,"_")
        return video
    }

    async convertToWebm(filePath){
        const { exec } = require('child_process');
        console.info("[wechat post]convert video to webm")
                
        await new Promise((resolve, reject)=>{
            const input=`ffmpeg -i "${filePath}" -c:v vp9 -c:a libopus output.webm`
            exec(input,{cwd:this.folder}, handleExecError(input, reject, resolve))
        })
        console.info("[wechat post]converted to webm")
        
        return `${this.folder}/output.webm`
    }

    async waitForSelector(selector, {timeout=30_000, interval=1000, hidden}={}) {
        if(hidden){
            return await new Promise((resolve, reject)=>{
                const timer=setInterval(async ()=>{
                    const el=await this.page.$(`wujie-app >>> ${selector}`)
                    if(!el){
                        clearInterval(timer)
                        resolve(el)
                    }
                },interval)
                setTimeout(()=>{
                    clearInterval(timer)
                    reject(`waitForSelector(${selector}) hidden timeout`)
                }, timeout)
            })
        }
        const el=await new Promise((resolve,reject)=>{
            const timer=setInterval(async ()=>{
                try{
                    const el=await this.page.$(`wujie-app >>> ${selector}`)
                    if(el){
                        clearInterval(timer)
                        resolve(el)
                    }
                }catch(e){
                    console.error(`waitForSelector(${selector}) error: ${e.message}`)
                    clearInterval(timer)
                    reject(e)
                }
            },interval)
            setTimeout(()=>{
                clearInterval(timer)
                reject(`waitForSelector(${selector}) timeout`)
            }, timeout)
        })
        return el
    }

    async doLoginCheck(timeout=5_000){
        return this.waitForSelector(this.constructor.checkLoginSelector,{timeout}).then(()=>true, e=>false)
    }

    async $(selector){
        const el=await this.page.$(`${this.app} >>> ${selector}`)
        if(!el){
            throw new Error(`Element ${selector} not found`)
        }
        return el
    }

    async upload(page) {
        this.log("Waiting for description input editor...");
        await (await this.waitForSelector('.input-editor')).click();
        this.log("Typing video description...");
        await (await this.$('.input-editor')).type(this.video.description)

        this.log(`Uploading video file: ${this.video.filePath}`);
        await (await this.$('input[type=file][accept*=video]')).uploadFile(this.video.filePath)

        this.log("Waiting for upload or format error...");
        const done=Promise.race([
            this.waitForSelector('.ant-progress-text')
                .then(()=>this.waitForSelector('video#fullScreenVideo',{timeout:this.timeout})).then(() => {
                    this.log("Video uploaded and preview available.");
                    return "发现删除键";
                }),
            
            this.waitForSelector('::-p-text(不支持此视频格式)',{timeout:5*1000}).then(
                async () => {
                    this.log("Video format not supported, converting to webm...");
                    const webm= await this.convertToWebm(this.video.filePath)

                    this.log(`Uploading converted webm file: ${webm}`);
                    await (await this.$('input[type=file][accept*=video]')).uploadFile(webm)

                    await this.waitForSelector('.ant-progress-text')
                        .then(()=>this.waitForSelector('video#fullScreenVideo',{timeout:this.timeout}))
                        .then(() => {
                            this.log("Converted webm uploaded and preview available.");
                            return "转换为webm格式成功";
                        })
                },
                ()=>done//if timeout, never resolve
            )
        ])
        await done

        this.log("Typing video title...");
        await (await this.waitForSelector('input[type=text][placeholder=概括视频主要内容，字数建议6-16个字符]')).type(this.video.title);

        this.log("Waiting for cover generation...");
        await this.waitForSelector("::-p-text(生成中)",{hidden:true})
        
        this.log("Clicking publish button...");
        await (await this.waitForSelector('button::-p-text(发表)')).click();

        this.log("Waiting for post to be published...");
        await this.waitForSelector("::-p-text(已发表)")

        return this.page.url()
    }

    async cleanup(){
        if(this.video.testing){
            const page=this.page
            const posted = await this.waitForSelector('.post-feed-item')
            await posted.hover()
            await (await posted.evaluateHandle(el=>el.parentElement.querySelector('.opr-item'), await posted.$('::-p-text(删除)'))).click()
            await (await page.waitForSelector('button::-p-text(确定)')).click();
            await this.waitForSelector("::-p-text(已删除)")
            this.log("Test post deleted.");
        }    
    }
}