const { Page, Locator, ElementHandle } = require('puppeteer-core');

/**
 * Playwright-style locator implementation for Puppeteer
 * Provides a chainable, lazy evaluation API similar to Playwright's locators
 */

class PuppeteerLocator {
    constructor(page, selector, options = {}) {
        this.page = page;
        this.selector = selector;
        this.options = { timeout: 30000, ...options }; // Shallow copy with default timeout
        this._filters = [];
        this._index = null;
    }

    /**
     * Filter locator by text content
     * @param {string|RegExp|{hasText: string|RegExp, has: Locator}} filter
     */
    filter(filter) {
        const newLocator = this._clone();
        if (typeof filter === 'object' && (filter.hasText || filter.has)) {
            if (filter.hasText) {
                newLocator._filters.push({ type: 'hasText', value: filter.hasText });
            }
            if (filter.has) {
                newLocator._filters.push({ type: 'has', value: filter.has });
            }
        } else {
            newLocator._filters.push({ type: 'hasText', value: filter });
        }
        return newLocator;
    }

    /**
     * Get nth element matching the locator
     * @param {number} index
     */
    nth(index) {
        const newLocator = this._clone();
        newLocator._index = index;
        return newLocator;
    }

    /**
     * Get first element
     */
    first() {
        return this.nth(0);
    }

    /**
     * Get last element
     */
    last() {
        return this.nth(-1);
    }

    /**
     * Find locator within this locator (descendant)
     * @param {string} selector
     */
    locator(selector) {
        const newLocator = new PuppeteerLocator(this.page, selector, this.options);
        newLocator._parent = this;
        return newLocator;
    }

    /**
     * Create a locator that matches either this locator or the argument locator
     * @param {PuppeteerLocator} otherLocator
     */
    or(otherLocator) {
        const newLocator = new PuppeteerLocator(this.page, async (page) => {
            // Try to resolve both locators with short timeout
            const promises = [
                this._resolve({ timeout: 100 }).catch(() => null),
                otherLocator._resolve({ timeout: 100 }).catch(() => null)
            ];
            
            // Return the first one that resolves
            const results = await Promise.all(promises);
            const element = results.find(el => el !== null);
            
            if (element) {
                return Promise.resolve({ asElement: () => element });
            }
            
            return null;
        }, this.options);
        
        newLocator._isOr = true;
        newLocator._orLocators = [this, otherLocator];
        return newLocator;
    }

    /**
     * Get by role within this locator
     * @param {string} role
     * @param {object} options
     */
    getByRole(role, options = {}) {
        if (options.name) {
            // Custom locator with role and name filtering
            const customLocator = new PuppeteerLocator(this.page, async (page) => {
                const parentElement = this._parent ? await this._parent._resolve() : null;
                const searchRoot = parentElement || page;
                
                return await (parentElement || page).evaluateHandle((searchRole, nameText, exact, isParent) => {
                    const root = isParent ? this : document;
                    const selector = `[role="${searchRole}"], ${searchRole}, input[type="${searchRole}"]`;
                    const elements = Array.from(root.querySelectorAll(selector));
                    for (const el of elements) {
                        let text = el.textContent.trim();
                        
                        // If element is an input, look for associated label
                        if (el.tagName === 'INPUT') {
                            // Try to find label by 'for' attribute matching input's id
                            if (el.id) {
                                const label = root.querySelector(`label[for="${el.id}"]`);
                                if (label) {
                                    text = label.textContent.trim();
                                }
                            }
                            // Or find parent label
                            if (!text) {
                                const parentLabel = el.closest('label');
                                if (parentLabel) {
                                    text = parentLabel.textContent.trim();
                                }
                            }
                        }
                        
                        if (exact) {
                            if (text === nameText) return el;
                        } else {
                            if (text.includes(nameText)) return el;
                        }
                    }
                    return null;
                }, role, options.name, options.exact || false, !!parentElement);
            }, options);
            
            customLocator._isCustom = true;
            customLocator._parent = this;
            return customLocator;
        }
        
        const baseSelector = `[role="${role}"], ${role}`;
        const newLocator = new PuppeteerLocator(this.page, baseSelector, this.options);
        newLocator._parent = this;
        return newLocator;
    }

    /**
     * Get by text within this locator
     * @param {string} text
     * @param {object} options
     */
    getByText(text, options = {}) {
        const parent = this; // Capture parent in closure
        const customLocator = new PuppeteerLocator(this.page, async (page) => {
            // If this locator has a parent, resolve it first
            let searchContext = page;
            if (parent._parent || parent.selector !== ':scope') {
                const parentElement = await parent._resolve();
                searchContext = parentElement;
            }
            
            // Check if searchContext is a page or element
            if (searchContext.evaluate) {
                // It's an ElementHandle
                return await searchContext.evaluateHandle((el, searchText, exact) => {
                    const elements = Array.from(el.querySelectorAll('*'));
                    
                    for (const child of elements) {
                        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(child.tagName)) continue;
                        
                        const directText = Array.from(child.childNodes)
                            .filter(node => node.nodeType === Node.TEXT_NODE)
                            .map(node => node.textContent.trim())
                            .filter(t => t.length > 0)
                            .join(' ');
                        
                        if (exact) {
                            if (directText === searchText) return child;
                        } else {
                            if (directText.includes(searchText)) return child;
                        }
                    }
                    return null;
                }, text, options.exact || false);
            } else {
                // It's a Page
                return await searchContext.evaluateHandle((searchText, exact) => {
                    const elements = Array.from(document.querySelectorAll('*'));
                    
                    for (const el of elements) {
                        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
                        
                        const directText = Array.from(el.childNodes)
                            .filter(node => node.nodeType === Node.TEXT_NODE)
                            .map(node => node.textContent.trim())
                            .filter(t => t.length > 0)
                            .join(' ');
                        
                        if (exact) {
                            if (directText === searchText) return el;
                        } else {
                            if (directText.includes(searchText)) return el;
                        }
                    }
                    return null;
                }, text, options.exact || false);
            }
        }, options);
        
        customLocator._isCustom = true;
        customLocator._parent = this;
        return customLocator;
    }

    /**
     * Get by label within this locator
     * @param {string} text
     * @param {object} options
     */
    getByLabel(text, options = {}) {
        const selector = `label::-p-text(${text})`;
        const newLocator = new PuppeteerLocator(this.page, selector, this.options);
        newLocator._parent = this;
        newLocator._resolve=(fx=>async function(){
            const element=await fx.call(this)
            if(element){
                return this._resolved=await this.page.evaluateHandle(a=>a.tagName=="LABEL" ? a : a.closest('label'), element)
            }
            return element
        })(newLocator._resolve)
        return newLocator;
    }

    /**
     * Get by placeholder within this locator
     * @param {string} text
     * @param {object} options
     */
    getByPlaceholder(text, options = {}) {
        const selector = options.exact
            ? `[placeholder="${text}"]`
            : `[placeholder*="${text}"]`;
        const newLocator = new PuppeteerLocator(this.page, selector, this.options);
        newLocator._parent = this;
        return newLocator;
    }

    /**
     * Get by test ID within this locator
     * @param {string} testId
     */
    getByTestId(testId) {
        const selector = `[data-testid="${testId}"]`;
        const newLocator = new PuppeteerLocator(this.page, selector, this.options);
        newLocator._parent = this;
        return newLocator;
    }

    /**
     * Get by title within this locator
     * @param {string} text
     * @param {object} options
     */
    getByTitle(text, options = {}) {
        const selector = options.exact
            ? `[title="${text}"]`
            : `[title*="${text}"]`;
        const newLocator = new PuppeteerLocator(this.page, selector, this.options);
        newLocator._parent = this;
        return newLocator;
    }

    /**
     * Get the content frame for iframe elements
     * Returns a locator scoped to the frame to support chaining
     */
    async contentFrame() {
        const element = await this._resolve();
        const frame = await element.contentFrame();
        
        // Return a locator for the frame root to support chaining
        return new PuppeteerLocator(frame, ':scope', this.options);
    }

    /**
     * Click the element
     * @param {object} options
     */
    async click(options = {}) {
        const element = await this._resolve();
        await element.click(options);
    }

    /**
     * Fill input element with text
     * @param {string} value
     */
    async fill(value) {
        const element = await this._resolve();
        await element.evaluate((el, val) => {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, value);
    }

    /**
     * Type text into element
     * @param {string} text
     * @param {object} options
     */
    async type(text, options = {}) {
        const element = await this._resolve();
        await element.type(text, options);
    }

    /**
     * Select option(s) in a select element
     * @param {string|string[]} values - Can be values or labels of options
     */
    async selectOption(values) {
        const element = await this._resolve();
        const valueArray = Array.isArray(values) ? values : [values];
        
        // Get all options and match by label or value
        const selectedValues = await element.evaluate((el, valuesToMatch) => {
            const options = Array.from(el.options);
            const result = [];
            
            for (const valueToMatch of valuesToMatch) {
                // Try to find by label first
                let option = options.find(opt => opt.textContent.trim() === valueToMatch);
                
                // If not found by label, try by value
                if (!option) {
                    option = options.find(opt => opt.value === valueToMatch);
                }
                
                if (option) {
                    result.push(option.value);
                }
            }
            
            return result;
        }, valueArray);
        
        if (selectedValues.length > 0) {
            await element.select(...selectedValues);
        }else{
            throw new Error(`no matched value`)
        }
    }

    /**
     * Check a checkbox or radio button
     */
    async check() {
        const element = await this._resolve();
        const isChecked = await element.evaluate(el => el.checked);
        if (!isChecked) {
            await element.click();
        }
    }

    /**
     * Uncheck a checkbox
     */
    async uncheck() {
        const element = await this._resolve();
        const isChecked = await element.evaluate(el => el.checked);
        if (isChecked) {
            await element.click();
        }
    }

    /**
     * Hover over the element
     */
    async hover() {
        const element = await this._resolve();
        await element.hover();
    }

    /**
     * Focus the element
     */
    async focus() {
        const element = await this._resolve();
        await element.focus();
    }

    /**
     * Press a key on the element
     * @param {string} key - The key to press (e.g., 'Enter', 'Tab', 'a')
     * @param {object} options - Options for the key press
     */
    async press(key, options = {}) {
        const element = await this._resolve();
        await element.press(key, options);
    }

    /**
     * Get text content
     */
    async textContent() {
        const element = await this._resolve();
        return await element.evaluate(el => el.textContent);
    }

    /**
     * Get inner text
     */
    async innerText() {
        const element = await this._resolve();
        return await element.evaluate(el => el.innerText);
    }

    /**
     * Get attribute value
     * @param {string} name
     */
    async getAttribute(name) {
        const element = await this._resolve();
        return await element.evaluate((el, attr) => el.getAttribute(attr), name);
    }

    /**
     * Get all matching elements count
     */
    async count() {
        const elements = await this._resolveAll();
        return elements.length;
    }

    /**
     * Check if element is visible
     */
    async isVisible() {
        try {
            const element = await this._resolve({ timeout: 1000, waitForEnabled: false });
            return await element.isVisible();
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if element is hidden
     */
    async isHidden() {
        try {
            const element = await this._resolve({ timeout: 1000, waitForEnabled: false });
            const visible = await element.isVisible();
            return !visible;
        } catch (e) {
            // Element not found means it's hidden
            return true;
        }
    }

    /**
     * Check if element is enabled
     */
    async isEnabled() {
        // Don't wait for enabled when checking state
        const element = await this._resolve({ waitForEnabled: false });
        return await element.evaluate(el => !el.disabled);
    }

    /**
     * Check if element is disabled
     */
    async isDisabled() {
        return !(await this.isEnabled());
    }

    /**
     * Wait for element to be visible
     * @param {object} options
     */
    async waitFor(options = {}) {
        const timeout = options.timeout || this.options.timeout || 30000;
        const state = options.state || 'visible';
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                const element = await this._resolve({ timeout: 1000 });
                
                if (state === 'visible') {
                    const isVisible = await element.isVisible();
                    if (isVisible) return element;
                } else if (state === 'hidden') {
                    const isVisible = await element.isVisible();
                    if (!isVisible) return element;
                } else if (state === 'attached') {
                    return element;
                }
            } catch (e) {
                if (state === 'detached' || state === 'hidden') {
                    return null;
                }
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error(`Timeout waiting for element: ${this.selector}`);
    }

    /**
     * Upload files to file input (for file uploads)
     * @param {string|string[]} files
     */
    async uploadFile(files) {
        const element = await this._resolve();
        const filePaths = Array.isArray(files) ? files : [files];
        await element.uploadFile(...filePaths);
    }

    /**
     * Set wait for enabled before action
     */
    setWaitForEnabled(enabled) {
        const newLocator = this._clone();
        newLocator.options.waitForEnabled = enabled;
        return newLocator;
    }

    /**
     * Take screenshot of the element
     * @param {object} options
     */
    async screenshot(options = {}) {
        const element = await this._resolve();
        return await element.screenshot(options);
    }

    /**
     * Evaluate function on the element
     * @param {function} pageFunction
     * @param {any} arg
     */
    async evaluate(pageFunction, arg) {
        const element = await this._resolve();
        return await element.evaluate(pageFunction, arg);
    }

    /**
     * Get bounding box of the element
     */
    async boundingBox() {
        const element = await this._resolve();
        return await element.boundingBox();
    }

    /**
     * Wait and return ElementHandle
     */
    async waitHandle() {
        return await this._resolve();
    }

    /**
     * Internal: Clone the locator
     */
    _clone() {
        const newLocator = new PuppeteerLocator(this.page, this.selector, { ...this.options });
        newLocator._filters = [...this._filters];
        newLocator._index = this._index;
        newLocator._parent = this._parent;
        return newLocator;
    }

    /**
     * Internal: Resolve to a single element
     */
    async _resolve(options = {}) {
        if(this._resolved){
            return this._resolved
        }
        const timeout = options.timeout || this.options.timeout || 30000;
        const startTime = Date.now();
        
        // If we need a specific index, wait for enough elements to exist
        if (this._index !== null) {
            const requiredIndex = this._index >= 0 ? this._index : Math.abs(this._index) - 1;
            const minElementsNeeded = requiredIndex + 1;
            
            // Wait for enough elements to satisfy the index
            while (Date.now() - startTime < timeout) {
                const elements = await this._resolveAll({ ...options, timeout: 1000 }).catch(() => []);
                
                if (elements.length >= minElementsNeeded) {
                    let index = this._index;
                    if (index < 0) {
                        index = elements.length + index;
                    }
                    
                    if (index >= 0 && index < elements.length) {
                        const element = elements[index];
                        
                        // Merge options with instance options, with passed options taking precedence
                        const mergedOptions = { ...this.options, ...options };
                        
                        // Wait for element to be enabled if option is set
                        if (mergedOptions.waitForEnabled) {
                            await this._waitForElementEnabled(element, mergedOptions);
                        }
                        
                        return element;
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            throw new Error(`Timeout waiting for element at index ${this._index} for selector: ${this.selector}`);
        }
        
        // No specific index, get first element
        const elements = await this._resolveAll(options);
        
        if (elements.length === 0) {
            throw new Error(`No elements found for selector: ${this.selector}`);
        }

        const element = elements[0];
        
        // Merge options with instance options, with passed options taking precedence
        const mergedOptions = { ...this.options, ...options };
        
        // Wait for element to be enabled if option is set
        if (mergedOptions.waitForEnabled) {
            await this._waitForElementEnabled(element, mergedOptions);
        }
        
        return this._resolved=element;
    }

    /**
     * Internal: Resolve to all matching elements
     */
    async _resolveAll(options = {}) {
        const timeout = options.timeout || this.options.timeout || 30000;
        const startTime = Date.now();
        
        // Build the query selector
        let baseSelector = this.selector;
        
        // Handle custom function selectors (e.g., from getByText, getByRole)
        if (typeof baseSelector === 'function') {
            // Auto-wait for element to be attached (Playwright behavior)
            while (Date.now() - startTime < timeout) {
                try {
                    const handle = await baseSelector(this.page);
                    const element = handle ? handle.asElement() : null;
                    if (element) {
                        return [element];
                    }
                } catch (e) {
                    // Continue waiting
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            throw new Error(`Timeout waiting for element: ${typeof this.selector === 'function' ? 'custom selector' : this.selector}`);
        }
        
        // Handle parent locator
        if (this._parent) {
            const parentElement = await this._parent._resolve();
            // Auto-wait for child elements to be attached
            let elements = [];
            while (Date.now() - startTime < timeout) {
                elements = await parentElement.$$(baseSelector);
                if (elements.length > 0) {
                    return await this._applyFilters(elements);
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            throw new Error(`Timeout waiting for elements: ${baseSelector}`);
        }

        // Handle page-level selection
        try {
            if (this.options.text) {
                // Text option passed from enhanced locator - auto-wait
                const text = this.options.text;
                const exact = this.options.exact || false;
                
                while (Date.now() - startTime < timeout) {
                    const elements = await this.page.$$(baseSelector);
                    const filtered = [];
                    
                    for (const el of elements) {
                        const textContent = await el.evaluate(e => e.textContent.trim());
                        if (exact ? textContent === text : textContent.includes(text)) {
                            filtered.push(el);
                        }
                    }
                    
                    if (filtered.length > 0) {
                        return await this._applyFilters(filtered);
                    }
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                throw new Error(`Timeout waiting for element with text: ${text}`);
            } else if (baseSelector.includes('::-p-text(')) {
                // Playwright-style text selector - auto-wait
                const match = baseSelector.match(/^(.*)::-p-text\((.*)\)$/);
                if (match) {
                    const [, selector, text] = match;
                    const cleanText = text.replace(/^["']|["']$/g, '');
                    
                    while (Date.now() - startTime < timeout) {
                        const elements = await this.page.$$(selector || '*');
                        const filtered = [];
                        
                        for (const el of elements) {
                            const textContent = await el.evaluate(e => e.textContent);
                            if (textContent && textContent.includes(cleanText)) {
                                filtered.push(el);
                            }
                        }
                        
                        if (filtered.length > 0) {
                            return await this._applyFilters(filtered);
                        }
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                    throw new Error(`Timeout waiting for element with text: ${cleanText}`);
                }
            }
            
            // Standard CSS selector
            await this.page.waitForSelector(baseSelector, { timeout });
            const elements = await this.page.$$(baseSelector);
            return await this._applyFilters(elements);
            
        } catch (error) {
            throw new Error(`Failed to find elements: ${baseSelector} - ${error.message}`);
        }
    }

    /**
     * Internal: Apply filters to elements
     */
    async _applyFilters(elements) {
        let filtered = [...elements];
        
        for (const filter of this._filters) {
            if (filter.type === 'hasText') {
                const newFiltered = [];
                for (const el of filtered) {
                    const text = await el.evaluate(e => e.textContent);
                    const matches = filter.value instanceof RegExp 
                        ? filter.value.test(text)
                        : text.includes(filter.value);
                    
                    if (matches) {
                        newFiltered.push(el);
                    }
                }
                filtered = newFiltered;
            } else if (filter.type === 'has') {
                const newFiltered = [];
                for (const el of filtered) {
                    const descendants = await el.$$(filter.value.selector);
                    if (descendants.length > 0) {
                        newFiltered.push(el);
                    }
                }
                filtered = newFiltered;
            }
        }
        
        return filtered;
    }

    /**
     * Internal: Wait for a specific element to be enabled
     */
    async _waitForElementEnabled(element, options = {}) {
        const timeout = options.timeout || this.options.timeout || 30000;
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                const isEnabled = await element.evaluate(el => {
                    // Check if element is enabled (not disabled)
                    if (el.disabled !== undefined) {
                        return !el.disabled;
                    }
                    // For elements without disabled property, consider them enabled
                    return true;
                });
                
                if (isEnabled) {
                    return;
                }
            } catch (e) {
                // Element might have been detached, continue waiting
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        throw new Error(`Timeout waiting for element to be enabled: ${this.selector}`);
    }
}

/**
 * Extend Page prototype with Playwright-style methods
 */
function extendPuppeteerPage() {
    // Store original methods
    const originalLocator = Page.prototype.locator;
    const originalWaitForSelector = Page.prototype.waitForSelector;
    
    // Add waitForTimeout helper for Playwright compatibility
    Page.prototype.waitForTimeout = async function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };
    
    // Enhanced waitForSelector with hidden option support
    Page.prototype.waitForSelector = function(selector, options = {}) {
        if (options?.hidden) {
            return new Promise((resolve, reject) => {
                const timer = setInterval(() => {
                    this.$(selector).then(el => {
                        if (!el) {
                            clearInterval(timer);
                            resolve();
                        }
                    }).catch(reject);
                }, 1000);
                setTimeout(() => {
                    clearInterval(timer);
                    reject(new Error(`waitForSelector(${selector}) hidden timeout`));
                }, options.timeout || 30000);
            });
        }
        return originalWaitForSelector.call(this, selector, { visible: true, ...options });
    };
    
    // Override locator to return PuppeteerLocator
    Page.prototype.locator = function(selector, options = {}) {
        // Handle non-string selectors (functions)
        if (typeof selector !== 'string') {
            return new PuppeteerLocator(this, selector, options);
        }
        
        // Handle app context (shadow DOM piercing)
        if (this.app) {
            selector = `${this.app} >>> ${selector}`;
        }
        
        // Parse ::-p-text() syntax
        if (selector.includes('::-p-text(')) {
            const parts = selector.split('::-p-text(');
            if (parts.length === 2) {
                const baseSelector = parts[0].trim();
                const text = parts[1].slice(0, -1).trim();
                options.text = text;
                selector = baseSelector || '*';
            }
        }
        
        const loc = new PuppeteerLocator(this, selector, options);
        
        // Apply timeout if specified
        if (options.timeout) {
            loc.options.timeout = options.timeout;
        }
        
        loc.page = this;
        
        return loc;
    };
    
    // getByRole locator
    Page.prototype.getByRole = function(role, options = {}) {
        if (options.name) {
            // Custom locator with role and name filtering
            const customLocator = new PuppeteerLocator(this, async (page) => {
                return await page.evaluateHandle((searchRole, nameText, exact) => {
                    const selector = `[role="${searchRole}"], ${searchRole}, input[type="${searchRole}"]`;
                    const elements = Array.from(document.querySelectorAll(selector));
                    for (const el of elements) {
                        let text = el.textContent.trim();
                        
                        // If element is an input, look for associated label
                        if (el.tagName === 'INPUT') {
                            // Try to find label by 'for' attribute matching input's id
                            if (el.id) {
                                const label = document.querySelector(`label[for="${el.id}"]`);
                                if (label) {
                                    text = label.textContent.trim();
                                }
                            }
                            // Or find parent label
                            if (!text) {
                                const parentLabel = el.closest('label');
                                if (parentLabel) {
                                    text = parentLabel.textContent.trim();
                                }
                            }
                        }
                        
                        if (exact) {
                            if (text === nameText) return el;
                        } else {
                            if (text.includes(nameText)) return el;
                        }
                    }
                    return null;
                }, role, options.name, options.exact || false);
            }, options);
            
            customLocator._isCustom = true;
            
            if (options.checked !== undefined) {
                return customLocator.filter(async (el) => {
                    const checked = await el.evaluate(e => e.checked || e.getAttribute('aria-checked') === 'true');
                    return checked === options.checked;
                });
            }
            
            return customLocator;
        }
        
        const baseSelector = `[role=\"${role}\"], ${role}`;
        const locator = new PuppeteerLocator(this, baseSelector, options);
        
        if (options.checked !== undefined) {
            return locator.filter(async (el) => {
                const checked = await el.evaluate(e => e.checked || e.getAttribute('aria-checked') === 'true');
                return checked === options.checked;
            });
        }
        
        return locator;
    };
    
    // getByText locator
    Page.prototype.getByText = function(text, options = {}) {
        // Create a custom locator that finds elements by text
        const customLocator = new PuppeteerLocator(this, async (page) => {
            return await page.evaluateHandle((searchText, exact) => {
                const elements = Array.from(document.querySelectorAll('*'));
                // Find elements whose direct text matches
                for (const el of elements) {
                    // Skip script, style, etc.
                    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
                    
                    // Get direct text content (not including children)
                    const directText = Array.from(el.childNodes)
                        .filter(node => node.nodeType === Node.TEXT_NODE)
                        .map(node => node.textContent.trim())
                        .filter(t => t.length > 0)
                        .join(' ');
                    
                    if (exact) {
                        if (directText === searchText) return el;
                    } else {
                        if (directText.includes(searchText)) return el;
                    }
                }
                return null;
            }, text, options.exact || false);
        }, options);
        
        customLocator._isCustom = true;
        return customLocator;
    };
    
    // getByLabel locator
    Page.prototype.getByLabel = function(text, options = {}) {
        // Find label by text, then find associated input
        const selector = `label::-p-text(${text})`;
        const locator=new PuppeteerLocator(this, selector, options);
        locator._resolve=(fx=>async function(){
            const element=await fx.call(locator)
            if(element){
                return this._resolved=await this.page.evaluateHandle(a=>a.tagName=="LABEL" ? a : a.closest('label'), element)
            }
            return element
        })(locator._resolve)
        return locator
    };
    
    // getByPlaceholder locator
    Page.prototype.getByPlaceholder = function(text, options = {}) {
        const selector = options.exact
            ? `[placeholder="${text}"]`
            : `[placeholder*="${text}"]`;
        return new PuppeteerLocator(this, selector, options);
    };
    
    // getByTestId locator
    Page.prototype.getByTestId = function(testId) {
        const selector = `[data-testid="${testId}"]`;
        return new PuppeteerLocator(this, selector);
    };
    
    // getByTitle locator
    Page.prototype.getByTitle = function(text, options = {}) {
        const selector = options.exact
            ? `[title="${text}"]`
            : `[title*="${text}"]`;
        return new PuppeteerLocator(this, selector, options);
    };
}

// Auto-extend when required
extendPuppeteerPage();

module.exports = {
    PuppeteerLocator,
    extendPuppeteerPage
};
