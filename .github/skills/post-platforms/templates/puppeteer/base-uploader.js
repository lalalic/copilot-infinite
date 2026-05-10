/**
 * Puppeteer tips:
 * page.locator(()=>...)
 * page.locator("button::-p-text(...)")=>button.textContent*=...
 * page.waitForFileChooser: seems not work
 */
class BaseUploader extends require("./base"){
    constructor(video, cookies) {
        super(...arguments)
        this.video=this.strict(video)
        this.storageState= !cookies ? null : (Array.isArray(cookies) ? {cookies} : cookies)
        this.timeout=this.video.timeout || 10*60*1000
    }


    strict({title, description, keywords=[], ...video}){
        const {titleLen=100, descLen=1000}=this.constructor
        return {
            ...video,
            title:title.substring(0,titleLen),
            description:`${description}\n#${keywords?.join("#")}`.substring(0, descLen)
        }
    }

    async upload(page) {
        throw new Error("upload() must be implemented by subclass");
    }

    async run(context) {
        await super.run(context)
        this.log(`start uploading`)
        try{
            return await this.upload(this.page)
        }finally{
            if(this.video.testing){
                await this.cleanup()
            }
        }
    }

    cleanup(){

    }
}

module.exports = BaseUploader;
