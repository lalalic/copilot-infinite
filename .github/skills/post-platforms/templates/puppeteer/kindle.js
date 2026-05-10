const { handleExecError } = require("../utils");
const BaseUploader = require("./base-uploader")

class Kindle extends BaseUploader {
    static baseURL="https://kdp.amazon.com/en_US/create"
    
    async upload(page) {
        const { filePath, cover, title,  description=title, categories = ["Non-Classifiable"],placement=[], keywords=[], author="qili2", lastname="qili2", price="3.99", age } = this.video
        await Promise.race([
            page.locator('button::-p-text(Create eBook)').click(),
            page.getByText("temporarily unavailable due to scheduled maintenance.")
                .waitFor().catch(e=>{throw new Error("KDP maintenance")})
        ])
        this.log("Creating ebook")

        await page.locator('#data-title').click();
        await page.locator('#data-title').fill(title);
        this.log(`set title: ${title}`)

        await page.locator('#data-primary-author-first-name').click();
        await page.locator('#data-primary-author-first-name').fill(author);
        this.log(`set author : ${author}`)

        await page.locator('#data-primary-author-last-name').click();
        await page.locator('#data-primary-author-last-name').fill(lastname);

        //set description
        await (await page.locator('iframe.cke_wysiwyg_frame').contentFrame()).locator('body').click();//@hack
        await page.evaluate(text => { CKEDITOR.instances.editor1.setData(text)}, description);
        await page.getByRole('radio', { name: 'I own the copyright and I' }).check();
        this.log(`set description`)

        //primary audience
        await page.getByRole('radio', { name: 'No' }).check();
        //age: 1 - 18+
        //min age
        if(age){
            const [min, max=18]=`${age}`.split('-').map(a=>parseInt(a.trim()))
            if(min<=18){
                await page.locator('#data-reading-interest-age-start-input span').nth(1).click();
                await page.locator(`li::-p-text(${min})`).click();
                await page.locator('span').filter({ hasText: new RegExp(`^${min}$`) }).nth(2).click();
            }
            
            if(max>min && max<=18){
                //max age
                await page.locator('span').filter({ hasText: /^Select$/ }).nth(2).click();
                await page.locator(`#data-reading-interest-age-end-input-native_${max-min+1}`).click();
            }
            this.log(`set audience`)
        }

        //category
        this.log('setting category')
        await page.getByRole('button', { name: 'Choose categories', waitForEnabled:true}).click();
        await page.locator(".a-popover-wrapper a.a-link-normal").hover();
        const popover=await page.locator('.a-popover-modal')
        await categories.reduce(async (prev, cate, i)=>{
            await prev
            return popover.locator("select").nth(i).selectOption(cate)
        }, Promise.resolve())
            .then(async a=>{
                await Promise.all(placement.map(a=>popover.getByLabel(a).locator(`input[type=checkbox]`).click()))
                return page.waitForSelector(`::-p-text(${placement.length} out of 3 category placements selected)`)
            })
            .catch(async e=>{
                this.log('use  Non-Classifiable since categories are wrong')
                await popover.locator("select").nth(0).selectOption("Non-Classifiable")
                await popover.getByLabel("Non-Classifiable").locator("input[type=checkbox]").click()
                await page.waitForSelector(`::-p-text(1 out of 3 category placements selected)`)
            })
        await popover.getByRole('button', { name: 'Save categories' }).click()
        this.log('set category')

        //keywords
        await Promise.all(keywords.map(async (keyword,i)=>{
            await page.locator(`#data-keywords-${i}`).click();
            await page.locator(`#data-keywords-${i}`).fill(keyword);
        }))

        this.log('saving details')
        await this.wait();
        await page.getByRole('button', { name: 'Save and Continue' }).click();

        await page.waitForResponse(res=>this.video.id=res.url().match(/kindle\/(?<id>[^\/]+)\/content/)?.groups.id)
        const id=this.video.id

        const errOccurred="error occurred"
        this.log('uploading ebook')
        await (await page.waitForSelector("input#data-assets-interior-file-upload-AjaxInput",{visible:false})).uploadFile(filePath)
        await this.waitForComplete("File processing complete. Manuscript check complete.", ["Uploading","Processing your file"], "still processing ebook", errOccurred)
        await page.getByRole("radio", {name:"No, do not apply Digital Rights", checked:false}).click()

        if(cover){
            this.log('uploading cover')
            await page.locator('a[role=button]::-p-text(Upload a cover you already)').click();

            await (await page.waitForSelector("input#data-assets-cover-file-upload-AjaxInput",{visible:false})).uploadFile(cover)
            await this.waitForComplete({selector:"img#data-assets-cover-file-upload-thumbnail[src]", timeout:2000},["Uploading", "Processing your file"], "still processing cover",errOccurred)
                .catch(async e=>{
                    if(e.message==errOccurred){
                        this.log('try to fix cover')
                        const fixed=await this.fixCover()
                        await page.locator('a[role=button]::-p-text(Upload a cover you already)').click();

                        await (await page.waitForSelector("input#data-assets-cover-file-upload-AjaxInput",{visible:false})).uploadFile(fixed)
                        await this.waitForComplete({selector:"img#data-assets-cover-file-upload-thumbnail[src]"},["Uploading", "Processing your file"], "still processing cover",errOccurred)
                            .catch(e=>this.log(e.message))
                    }else{
                        this.log(e.message) 
                    }
                })
        }

        //no AI
        await page.getByRole('radio', { name: 'No', exact: true }).click();//@todo: invalid sometimes
        //make sure all confirmed
        this.log('saving content')
        await page.$$eval("[role=checkbox][aria-checked=false]::-p-text(By clicking this, I confirm)", nodes=>nodes.forEach(node=>node.click()))
        await page.getByRole('button', { name: 'Save and Continue'}).click();

        await page.waitForResponse(res=>res.url().startsWith(`https://kdp.amazon.com/en_US/title-setup/kindle/${id}/pricing`))

        this.log('setting prices')
        //publishing
        await page.getByRole('checkbox', { name: 'Enroll my book in KDP Select'}).check();

        await page.locator('input[name="data[digital][royalty_rate]-radio"][value="70_PERCENT"]').click()
        //price
        await page.locator('input[name="data[digital][channels][amazon][US][price_vat_inclusive]"]').click();
        await page.locator('input[name="data[digital][channels][amazon][US][price_vat_inclusive]"]').fill(price+"");
        await page.locator('input[name="data[digital][channels][amazon][US][price_vat_inclusive]"]').press('Enter');

        this.log('saving as draft')
        await page.getByRole('button', { name: 'Save as Draft' }).click();
        // await page.getByRole('button', { name: 'Publish Your Kindle eBook' }).click();
        
        await this.wait(1000)

        this.log(`kindle ebook is at ${page.url()}`)
        return page.url()
    }

    async cleanup(){
        if(this.video.testing && this.video.id){
            const page=this.page
            await page.goto("https://kdp.amazon.com/en_US/bookshelf")
            const posted=await page.waitForSelector("table.refreshedbookshelftable tr")
            await (await posted.$("button.overflow-action-button")).click()
            await this.wait(500)
            await (await page.waitForSelector(`#delete-${this.video.id}`)).click();
            await (await page.waitForSelector('button#delete-title-ok-announce')).click();
            await this.wait(500)
        }
    }

    async fixCover(){
        const { exec } = require('child_process');
        await new Promise((resolve, reject)=>{
            const input=`ffmpeg -i ${this.video.cover} -vf "scale=625:1000:force_original_aspect_ratio=decrease,pad=625:1000:(ow-iw)/2:(oh-ih)/2:color=white" cover.jpg`
            exec(input,{cwd:this.folder}, handleExecError(input, reject, resolve))
        })
        return this.video.cover=`${this.folder}/cover.jpg`
    }
}

module.exports = Kindle