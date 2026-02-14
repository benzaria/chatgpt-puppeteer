import '../cli/arguments.ts'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { providers, env, saveSecrets } from '../utils/config.ts'
import { template, echo, delay } from '../utils/helpers.ts'
import { main } from '../agent/instructions.ts'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

// --- CLEANUP LOGIC ---
global.shutdown = async () => {
  echo.inf('Closing session...')
  await global.browser?.close()
  await rm(join(env.user_data, 'Default/Sessions'), { recursive: true, force: true })
    .catch(() => echo.vrb('err', 'No such file or directory: "/Default/Sessions"'))
  process.exit()
}

async function initPage(headless: boolean | 'new' = 'new') {
  puppeteer.use(StealthPlugin())

  echo.inf.lr('Initializing Puppeteer...' )
  global.browser = await puppeteer.launch({
    headless: headless as any,
    userDataDir: env.user_data,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--no-default-browser-check',
      '--restore-last-session=false',
    ],
  })

  // --- TAB MANAGEMENT ---
  global.page = await browser.newPage()
  await page.setUserAgent({ userAgent: env.userAgent })
  await page.setViewport({ width: 600, height: 600 })
  await page.setRequestInterception(true)

  page.on('request', req => {
    if (['image','font','media', args.headless && 'stylesheet'].includes(req.resourceType()))
      req.abort()
    else
      req.continue()
  })

  browser.on('targetcreated', async (target) => {
    if (target.type() === 'page') {
      const newPage = await target.page()
      await newPage?.close()
    }
  })

  echo.scs('Puppeteer ready.')
}

async function initProvider(model: Models) {
  try {
    echo.inf.lr('Initializing Provider...')
    const spl = model.split('/') as [Providers, LLMs]
    global.provider = spl[0]
    global.model = spl[1]

    await page.bringToFront()
    await page.goto(
      providers[provider]['api'] + (
        args['new-conv'] ? '' :
        args['best-conv'] && env.best_conversation ? `c/${env.best_conversation}` :
        env.conversation ? `c/${env.conversation}` : ''
      ),
      { waitUntil: 'domcontentloaded', timeout: env.timeout }
    )
    await page.addStyleTag({
      content: '*,*::before,*::after{animation:none!important;transition:none!important}'
    })

    await page.waitForSelector(providers[provider]['selector'].request, { timeout: env.timeout })

    echo.scs('Provider ready.')

  } catch (err) {
    echo.err('Provider initialization failed:', err)
    shutdown()
  } finally {
    browser.pages()
      .then(pages => pages.forEach(page =>  page !== global.page ? page.close() : null))
      .catch(() => echo.wrn('Pages cleanup failed'))

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
    process.on('uncaughtException', (err) => {
      echo.err(err)
      shutdown()
    })
  }
}

async function initModel(instructions: object) {
  echo.inf.lr('Initializing Model...')
  global.instructions = instructions

  const verbose = args.verbose
  args.verbose = false
  const res = await chat({request: "status", ...instructions})
  args.verbose = verbose

  if (res?.includes('OK'))
    echo.scs("Model ready.")
  else
    echo.wrn('Model initialization failed:', res)

  await page.waitForFunction(() => {
    return location.pathname.startsWith('/c/')
  }, { timeout: env.timeout })

  const conversation = page.url().split('/c/')[1]
  echo.inf('Conversation UUID:', conversation)
 
  saveSecrets({ conversation })
}

async function ask(q: Query) {
  if (!global.page) return initPrblm('Page', 'err'), 'Could not get response.'
  if (!global.provider) return initPrblm('Provider', 'err'), 'Could not get response.'

  echo.inf(`\nquestion: ${q.question}${q.context ? '\ncontext: ' + q.context : '' }\n`)
  const prompt = template(q)

  await page.evaluate((text: string, selector: string) => {
    const textarea = document.querySelector(selector) as HTMLTextAreaElement
    if (textarea) {
      textarea.innerHTML = text
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }, prompt, providers[provider]['selector'].request)

  await delay(200)
  await page.click(providers[provider]['selector'].sendBtn)

  echo.inf.lr('Waiting for AI response...')
  await page.waitForSelector(providers[provider]['selector'].stopBtn, { visible: true, timeout: env.timeout })

  const response = await page.evaluate((selector) => {
    const messages = document.querySelectorAll(selector)
    const lastMessage = messages[messages.length - 1] as HTMLElement
    return lastMessage ? lastMessage.innerText.trim() : 'Could not find response.'
  }, providers[provider]['selector'].response)

  echo.vrb([32, "RESPONSE"],
    '\n-------------------------\n' +
    response +
    '\n-------------------------\n'
  )

  return response
}

async function chat(p: object | string) {
  if (!global.page) return initPrblm('Page', 'err')
  if (!global.provider) return initPrblm('Provider', 'err')
  if (!global.instructions) initPrblm('Model', 'wrn')

  const prompt = JSON.stringify(typeof p === 'string' ? {request: p} : p)

  await page.evaluate((text: string, selector: string) => {
    const textarea = document.querySelector(selector) as HTMLTextAreaElement
    if (textarea) {
      textarea.innerHTML = text
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }, prompt, providers[provider]['selector'].request)

  await delay(200)
  await page.click(providers[provider]['selector'].sendBtn)

  echo.inf.lr('Waiting for AI response...')
  await page.waitForSelector(providers[provider]['selector'].stopBtn, { visible: true, timeout: env.timeout })

  const response = await page.evaluate((selector) => {
    const messages = document.querySelectorAll(selector.response)
    const lastMessage = messages[messages.length - 1] as HTMLElement

    if (!lastMessage) return 'Could not get response.'

    const responseBlock = lastMessage.querySelector(selector.responseBlock) as HTMLElement
    return (responseBlock ? responseBlock.innerText : lastMessage.innerText).trim()
  }, providers[provider]['selector'])

  echo.vrb([32, "RESPONSE"],
    '\n-------------------------\n' +
    response +
    '\n-------------------------\n'
  )

  return response
}

const initPrblm = (step: 'Page' | 'Provider' | 'Model', level: 'err' | 'wrn') => (
  echo[level](`${step} not initialized. Call \`init${step}\` first.`),
  'Could not get response.'
)

async function initBot() {
  await initPage(args.headless)
  await initProvider(args.model)
  await initModel(main)
}

// This ensures it only runs if called directly
if (import.meta.main) {
  (async () => {
    await initBot()
    await chat('write a poem about morocco')
    shutdown()
  })()
}

export {
  initPage,
  initProvider,
  initModel,
  initBot,
  ask,
  chat,
}
