import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { setTimeout } from 'node:timers/promises'
import { template, echo } from './helpers.ts'
import config from './config.ts'

const { selector, env } = config

async function initPage(headless: boolean | 'new' = 'new', temp: boolean = false) {
  puppeteer.use(StealthPlugin())

  echo('Initializing Puppeteer...')
  const browser = await puppeteer.launch({
    headless: headless as any,
    userDataDir: './__user_data',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  // --- TAB MANAGEMENT ---
  const pages = await browser.pages()
  
  // Use the existing first page instead of closing it and making a new one
  globalThis.page = pages.length > 0 ? pages[0] : await browser.newPage()

  // Close any additional pages that might have opened (like popups)
  for (let i = 1; i < pages.length; i++) {
    await pages[i].close()
  }

  await page.setUserAgent(env.userAgent)

  // Auto-close any new popups that try to open later
  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      const newPage = await target.page()
      await newPage?.close()
    }
  })

  try {
    echo('Loading ChatGPT...')
    await page.goto(
      `https://chatgpt.com/${temp ? '?temporary-chat=true': ''}`,
      { waitUntil: 'networkidle2', timeout: env.timeout }
    )

    // Check if we are stuck on a login or splash screen
    await page.bringToFront()
    await page.waitForSelector(selector.request, { timeout: env.timeout })
    echo('Page ready.') 
  } catch (error) {
    echo.err('Initialization failed:', error)
  }
}

async function initModel(model: Model = env.model) {
  echo('Initializing Model...')
  globalThis.model = model

  const res = await ask({
    model, question: 'responde with "OK" if undestood'
  })

  if (res?.toLowerCase()?.includes('ok')) echo("Model ready.")
}

async function ask(q: Query) {
  if (!page) return echo.err("Page not initialized. Call initPage first.")
  if (!model) echo.wrn("model not initialized. Call initModel first.")

  echo(`\nquestion: ${q.question}${q.context ? '\ncontext: ' + q.context : '' }\n`)
  const promptText = template(q)

  await page.evaluate((text: string, selector: string) => {
    const textarea = document.querySelector(selector) as HTMLTextAreaElement
    if (textarea) {
      textarea.innerHTML = text
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }, promptText ?? '', selector.request)

  // Small delay to let the UI register the text
  await setTimeout(500)
  await page.click(selector.sendBtn)

  echo("Waiting for AI response...")

  await page.waitForSelector(selector.voiceBtn, { visible: true, timeout: env.timeout })

  const responseText = await page.evaluate((selector) => {
    const messages = document.querySelectorAll(selector)
    const lastMessage = messages[messages.length - 1] as HTMLElement
    return lastMessage ? lastMessage.innerText : 'Could not find response.'
  }, selector.response)

  echo('\n--- Captured Response ---')
  echo(responseText)
  echo('-------------------------\n')

  return responseText
}

// This ensures it only runs if called directly
if (import.meta.main) {
  // Execution logic
  (async () => {
    await initPage(false, false)
    await initModel('gpt-5-mini')

    await ask({
      question: 'can u send a msg in whatsapp to +212616032508 asking if he is free to hang out tmrw',
      context: ``
    })

    process.exit(0)
  })()
}

export {
  initPage,
  initModel,
  ask,
}
