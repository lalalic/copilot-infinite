// runUploads.js
const chromium = require('puppeteer-extra')
const stealth = require('puppeteer-extra-plugin-stealth')

const stealthPlugin = stealth();
stealthPlugin.enabledEvasions.delete("iframe.contentWindow");
stealthPlugin.enabledEvasions.delete("media.codecs");

chromium.use(stealthPlugin);
require("./locator")

module.exports=class{
    static async launch(browserOpt){
        if(!browserOpt.headless){
            const chromeLauncher = await (async ()=>{
                try{
                    return require('chrome-launcher')
                }catch{
                    return await import('chrome-launcher')
                }
            })();
            browserOpt.executablePath = chromeLauncher.Launcher.getFirstInstallation();
        }
        const browser=await chromium.launch(browserOpt);
        browser.headless=!!browserOpt.headless
        return browser
    }
    
    get baseURL(){
        return this.constructor.baseURL
    }

    get name(){
        return this.constructor.name
    }

    log(message){
        this._log?.(`[${this.name}] - ${message}`)
    }

    async doLoginCheck(timeout=5_000){
        if(this.constructor.checkLoginSelector){
            return this.page.waitForSelector(this.constructor.checkLoginSelector,{timeout}).then(()=>true, e=>false)
        }
        return true
    }

    async login(page) {
        const base=this.baseURL.split("?")[0]
        const res=await page.goto(this.baseURL)
        if(res.url().startsWith(base)){
            if(await this.doLoginCheck(30_000)){
                return 
            }else{
                this.log("need login")
            }
        }
        if(!this.page.browser.headless){
            const res1=await page.waitForResponse(res=>{
                return res.url().startsWith(base) && res.ok
            },{timeout: 2*60*1000})
            this.log(`login done ${res1.url()} status:${res1.statusText()}`)
            return 
        }
        throw new Error("can't login")
    }

    async cookies(){
        const domain=this.baseURL.match(/([^\/]?)\.com/)[1]
        const all=await this.context.cookies()
        const cookies=all.filter(a=>a.domain.endsWith(`${domain}.com`))
        return cookies
    }

    async run(context) {
        this.context=context
        const page =this.page=await this.context.newPage();
        page.exposeFunction('$', selector=>page.$(selector))
        page.exposeFunction('$$', selector=>page.$$(selector))
        try{
            await this.login(page);

            try{
                this.storageState?.update?.(await this.cookies())
            }catch(e){
                this.log(`failed to save session storage: ${e.message}`)
            }
        }catch(e){
            this.log(`login failed: ${e.message}`)
            throw new Error(`[${this.name}] login failed`)
        }

        if(!this.page.url().startsWith(this.baseURL)){
            await page.goto(this.baseURL)
        }

    }

    wait(t=1000){
        return new Promise(resolve=>setTimeout(()=>resolve(), t))
    }

    async waitForComplete(complete, processing, message={text:"still processing", timeout:200}, error){
        complete=typeof(complete)=="string" ? {text:complete, timeout:7000} : complete
        message=typeof(message)=="string" ? {text:message, timeout:200} : message
        processing=Array.isArray(processing) ? processing : [processing]
        if(complete.text){
            processing.push(complete.text)
        }
        processing=processing.map(a=>`::-p-text(${a})`).join(",")
        let i=5// 5 times to avoid
        this.log(message.text)
        while(i!=0){
            i=await this.page.waitForSelector(complete.selector || `::-p-text(${complete.text})`,{timeout:complete.timeout}).then(a=>0)
                .catch(e=>this.page.waitForSelector(processing,{timeout:message.timeout})
                    .then(e=>{this.log(message.text+=".");return i})
                    .catch(async e=>{
                        if(error){
                            if(await this.page.$$eval(`::-p-text(${error})`, all=>!!all.find(a=>!!a.getBoundingClientRect().width))){
                                throw new Error(error)
                            }
                        } 
                        if(i>0){
                            return --i;
                        } 
                        throw e
                    })
                )
        }
    }

}