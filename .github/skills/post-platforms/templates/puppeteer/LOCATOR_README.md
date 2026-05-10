# Playwright-Style Locator for Puppeteer

A comprehensive implementation of Playwright's locator API for Puppeteer, providing a familiar and intuitive way to interact with web elements.

## Features

- 🎯 **Playwright-compatible API** - Use the same locator patterns you know from Playwright
- 🔗 **Chainable methods** - Build complex queries with method chaining
- 🎭 **Lazy evaluation** - Locators are evaluated when actions are performed
- 🔍 **Powerful filters** - Filter elements by text, regex, or nested content
- 📦 **Zero dependencies** - Works with puppeteer-core out of the box

## Installation

```javascript
require('./lib/post/locator')
```

The locator functionality is automatically enabled when you require the locator module.

## Basic Usage

### Creating Locators

```javascript
// CSS selector
const button = page.locator('button')
const submitBtn = page.locator('.submit-btn')
const idElement = page.locator('#my-id')

// Text selector (Playwright style)
const clickMe = page.locator('button::-p-text(Click Me)')

// getBy methods
const heading = page.getByText('Welcome')
const submitButton = page.getByRole('button', { name: 'Submit' })
const nameInput = page.getByPlaceholder('Enter name')
const testElement = page.getByTestId('my-test-id')
const titleElement = page.getByTitle('Click here')
```

### Performing Actions

```javascript
// Click
await page.locator('button').click()

// Fill input
await page.locator('#username').fill('john.doe')

// Type text (with typing simulation)
await page.locator('#search').type('hello world')

// Check/uncheck
await page.locator('#agree').check()
await page.locator('#newsletter').uncheck()

// Select dropdown option
await page.locator('#country').selectOption('US')

// Hover
await page.locator('.menu-item').hover()

// Focus
await page.locator('#input-field').focus()

// Upload files
await page.locator('input[type=file]').setInputFiles('/path/to/file.pdf')
```

## Advanced Features

### Filtering

```javascript
// Filter by text
const deleteBtn = page.locator('button').filter({ hasText: 'Delete' })

// Filter by regex
const editBtn = page.locator('button').filter({ hasText: /^Edit$/i })

// Filter by nested element
const cardWithButton = page.locator('.card').filter({ 
    has: page.locator('button') 
})
```

### Indexing

```javascript
// Get specific element by index
const secondItem = page.locator('.item').nth(1)

// Get first element
const firstItem = page.locator('.item').first()

// Get last element
const lastItem = page.locator('.item').last()

// Negative indices work too
const secondToLast = page.locator('.item').nth(-2)
```

### Nested Locators

```javascript
// Find element within another element
const container = page.locator('.container')
const button = container.locator('button')

// Chain multiple levels
const form = page.locator('form')
const input = form.locator('.field-group').locator('input')
```

### Frames

```javascript
// Work with iframes
const frame = await page.locator('iframe[title="Editor"]').contentFrame()
const body = frame.locator('body')
await body.click()
```

### Querying

```javascript
// Get text content
const text = await page.locator('h1').textContent()
const innerText = await page.locator('.content').innerText()

// Get attribute
const href = await page.locator('a').getAttribute('href')

// Count elements
const count = await page.locator('.item').count()

// Check visibility
const isVisible = await page.locator('#element').isVisible()
const isHidden = await page.locator('#element').isHidden()

// Check enabled state
const isEnabled = await page.locator('button').isEnabled()
const isDisabled = await page.locator('button').isDisabled()

// Get bounding box
const box = await page.locator('#element').boundingBox()
```

### Waiting

```javascript
// Wait for element to be visible (default)
await page.locator('.loading').waitFor()

// Wait for specific state
await page.locator('.message').waitFor({ state: 'visible' })
await page.locator('.spinner').waitFor({ state: 'hidden' })
await page.locator('.element').waitFor({ state: 'attached' })

// Wait with custom timeout
await page.locator('.slow-element').waitFor({ timeout: 60000 })

// Wait for enabled before action
await page.locator('button')
    .setWaitForEnabled(true)
    .click()
```

### Custom Evaluation

```javascript
// Evaluate function on element
const bgColor = await page.locator('.box').evaluate(el => {
    return window.getComputedStyle(el).backgroundColor
})

// Screenshot element
await page.locator('.component').screenshot({ 
    path: 'screenshot.png' 
})
```

## getBy Methods

### getByRole

```javascript
// Basic role
const button = page.getByRole('button')

// With name
const submit = page.getByRole('button', { name: 'Submit' })

// With regex name
const saveBtn = page.getByRole('button', { name: /save/i })

// With checked state
const checkedBox = page.getByRole('checkbox', { checked: true })
```

### getByText

```javascript
// Find by text content
const heading = page.getByText('Welcome')

// Exact match
const exact = page.getByText('Sign In', { exact: true })
```

### getByPlaceholder

```javascript
// Find input by placeholder
const email = page.getByPlaceholder('Email address')

// Exact match
const exact = page.getByPlaceholder('Username', { exact: true })
```

### getByLabel

```javascript
// Find input by associated label
const name = page.getByLabel('Full Name')
```

### getByTestId

```javascript
// Find by data-testid attribute
const element = page.getByTestId('submit-button')
```

### getByTitle

```javascript
// Find by title attribute
const tooltip = page.getByTitle('Click to close')
```

## Real-World Examples

### Form Submission

```javascript
// Fill and submit a form
await page.locator('#username').fill('user@example.com')
await page.locator('#password').fill('secretpassword')
await page.locator('#remember-me').check()
await page.getByRole('button', { name: 'Sign In' }).click()
```

### Working with Lists

```javascript
// Get all items
const items = page.locator('.todo-item')
const count = await items.count()

// Click on specific item
await items.nth(2).click()

// Find item by text
await items.filter({ hasText: 'Buy groceries' })
    .locator('.delete-btn')
    .click()
```

### Modal Interaction

```javascript
// Wait for modal and interact
await page.getByRole('button', { name: 'Open Settings' }).click()
const modal = page.locator('.modal')
await modal.waitFor()
await modal.locator('#theme').selectOption('dark')
await modal.getByRole('button', { name: 'Save' }).click()
```

### File Upload

```javascript
// Upload single file
await page.locator('input[type=file]')
    .setInputFiles('./document.pdf')

// Upload multiple files
await page.locator('input[type=file][multiple]')
    .setInputFiles(['./file1.jpg', './file2.jpg'])
```

### Working with Tables

```javascript
// Find row containing text and click action
const row = page.locator('tr').filter({ hasText: 'John Doe' })
await row.locator('button.edit').click()

// Get all cells in a column
const cells = page.locator('td:nth-child(2)')
const count = await cells.count()
```

## API Reference

### Locator Methods

| Method | Description |
|--------|-------------|
| `click(options)` | Click the element |
| `fill(value)` | Fill input with value |
| `type(text, options)` | Type text character by character |
| `selectOption(values)` | Select dropdown option(s) |
| `check()` | Check checkbox/radio |
| `uncheck()` | Uncheck checkbox |
| `hover()` | Hover over element |
| `focus()` | Focus element |
| `textContent()` | Get text content |
| `innerText()` | Get inner text |
| `getAttribute(name)` | Get attribute value |
| `count()` | Count matching elements |
| `isVisible()` | Check if visible |
| `isHidden()` | Check if hidden |
| `isEnabled()` | Check if enabled |
| `isDisabled()` | Check if disabled |
| `waitFor(options)` | Wait for element state |
| `setInputFiles(files)` | Upload file(s) |
| `screenshot(options)` | Take screenshot |
| `evaluate(fn, arg)` | Evaluate function |
| `boundingBox()` | Get bounding box |
| `contentFrame()` | Get iframe's frame |

### Filtering & Selection

| Method | Description |
|--------|-------------|
| `filter(options)` | Filter by text or nested element |
| `nth(index)` | Get element at index |
| `first()` | Get first element |
| `last()` | Get last element |
| `locator(selector)` | Find nested element |

### Page Methods

| Method | Description |
|--------|-------------|
| `page.locator(selector, options)` | Create locator |
| `page.getByRole(role, options)` | Locate by role |
| `page.getByText(text, options)` | Locate by text |
| `page.getByLabel(text, options)` | Locate by label |
| `page.getByPlaceholder(text, options)` | Locate by placeholder |
| `page.getByTestId(testId)` | Locate by test ID |
| `page.getByTitle(text, options)` | Locate by title |

## Differences from Playwright

While this implementation provides a Playwright-compatible API, there are some differences due to Puppeteer's underlying architecture:

1. **Performance**: Some operations may be slower than native Playwright
2. **Custom Selectors**: Playwright's custom selector engines are not supported
3. **Strict Mode**: Auto-waiting behavior may differ slightly
4. **Frame Handling**: Frame interactions work but syntax may vary slightly

## Contributing

Feel free to open issues or submit pull requests for improvements!

## License

MIT
