import '@benzn/to-ms/extender'
import './arguments.ts'

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { template, echo, delay } from './helpers.ts'
import config from './config.ts'

const { selector, env } = config

async function initPage({
  headless = 'new', 
  temp = false
}: {
  headless?: boolean | `${boolean}` | 'new';
  temp?: boolean;
} = {}) {
  puppeteer.use(StealthPlugin())
  const isHeadless = headless === 'true' ? true : headless === 'false' ? false : headless

  echo.inf('Initializing Puppeteer...' + prvLine)
  const browser = await puppeteer.launch({
    headless: isHeadless as any,
    userDataDir: './__user_data',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  // --- TAB MANAGEMENT ---
  globalThis.page = await browser.newPage()
  await page.setUserAgent(env.userAgent)
  
  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      const newPage = await target.page()
      await newPage?.close()
    }
  })
  echo.suc('Puppeteer ready.' + clrLine)

  try {
    echo.inf('Loading ChatGPT...' + prvLine)
    await page.goto(
      `https://chatgpt.com/${temp ? '?temporary-chat=true': ''}`,
      { waitUntil: 'networkidle2', timeout: env.timeout }
    )

    await page.bringToFront()
    await page.waitForSelector(selector.request, { timeout: env.timeout })
    echo.suc('ChatGPT ready.' + clrLine) 

  } catch (error) {
    echo.err('Puppeteer initialization failed:', error)
  } finally {
    // --- CLEANUP LOGIC ---
    browser.pages()
      .then(pages => pages.forEach(page =>  page !== globalThis.page ? page.close() : null))
      .catch(echo.err)

    globalThis.shutdown = async () => {
      echo.inf('Closing session...')
      await browser.close()
      process.exit()
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    process.on('uncaughtException', shutdown)
  }
}

async function initModel(model: Model = env.model) {
  echo.inf('Initializing Model...' + prvLine)
  globalThis.model = model

  const verbose = args.verbose
  args.verbose = false
  const res = await ask({model, question: 'responde with "OK" if undestood'})
  args.verbose = verbose

  if (res?.toLowerCase()?.includes('ok'))
    echo.suc("Model ready." + clrLine)
  else
    echo.wrn('Model initialization failed:' + clrLine, res)
}

async function ask(q: Query) {
  if (!globalThis.page) return echo.err("Page not initialized. Call `initPage` first.")
  if (!globalThis.model) echo.wrn("model not initialized. Call `initModel` first.")

  echo.inf(`\nquestion: ${q.question}${q.context ? '\ncontext: ' + q.context : '' }\n`)
  const promptText = template(q)

  await page.evaluate((text: string, selector: string) => {
    const textarea = document.querySelector(selector) as HTMLTextAreaElement
    if (textarea) {
      textarea.innerHTML = text
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }, promptText ?? '', selector.request)

  await delay(500)
  await page.click(selector.sendBtn)

  echo.inf('Waiting for AI response...' + prvLine)
  await page.waitForSelector(selector.voiceBtn, { visible: true, timeout: env.timeout })

  const responseText = await page.evaluate((selector) => {
    const messages = document.querySelectorAll(selector)
    const lastMessage = messages[messages.length - 1] as HTMLElement
    return lastMessage ? lastMessage.innerText : 'Could not find response.'
  }, selector.response)

  echo.inf(
    clrLine +
    '\n--- Captured Response ---\n' +
    responseText +
    '\n-------------------------\n'
  )

  return responseText
}

// This ensures it only runs if called directly
if (import.meta.main) {
  // Execution logic
  (async () => {
    await initPage({
      headless: 'new',
      temp: false
    })
    await initModel('gpt-5-mini')

    await ask({
      question: 'can u send a msg in whatsapp to +212616032508 asking if he is free to hang out tmrw',
      context: ``
    })

    process.exit()
  })()
}

export {
  initPage,
  initModel,
  ask,
}
