import { writeFile } from 'node:fs/promises'
import { homedir, platform } from 'node:os'
import { pathToFileURL } from 'node:url'
import { echo } from './helpers.ts'
import { cwd } from 'node:process'
import { join } from 'node:path'

type Secrets = typeof import('./secrets_alt.json')

const secretsPath = join(cwd(), '!secrets.json')
const secretsPathAlt = join(import.meta.dirname, 'secrets_alt.json')

function loadSecrets() {

  const imp = async (path: string) => (
    await import(
      pathToFileURL(path).href,
      { with: { type: 'json' } }
    )
  ).default as Secrets

  try {
    return imp(secretsPath)
  } catch (err) {
    echo.wrn(`
      Secrets are not setup at: "${secretsPath.replaceAll('\\', '/')}"
      Loading default template: "${secretsPathAlt.replaceAll('\\', '/')}"
    `, err)

    return imp(secretsPathAlt)
  }
}

const secrets = await loadSecrets()

type Config = {
  providers: {
    [x: string]: {
      api: `${string}/`
      models: string[]
      selector: Record<string, string>
    }
  }

  env: {
    os: NodeJS.Platform
    home: string
    cwd: string
    port: number
    timeout: number
    model: Models
    userAgent: string
  } & Secrets

  ask_instructions: () => string
}

const providers = {
  openai: {
    api: 'https://chatgpt.com/',
    models: [
      'gpt-5-mini',
      'gpt-5.2-instant',
      'gpt-5.2-thinking',
    ],
    selector: {
      request: '#prompt-textarea',
      sendBtn: '#composer-submit-button',
      stopBtn: '#composer-submit-button[disabled]',
      response: '[data-message-author-role="assistant"]',
      responseBlock: 'code',
    }
  },
  google: {
    api: 'https://gemini.google.com/',
    models: [
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'gemini-3-pro-preview',
    ],
    selector: {
      request: '[role="textbox"]',
      sendBtn: '[aria-label="Send message"]',
      stopBtn: '[aria-label="Send message"][aria-disabled="true"]',
      response: '',
      responseBlock: 'code',
    }
  },
} as const satisfies Config['providers']

const env = {
  os: platform(),
  home: homedir(),
  cwd: cwd(),
  port: 3000,
  timeout: 90000,
  model: 'openai/gpt-5-mini',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ...secrets
} as const satisfies Config['env']

const ask_instructions = () => `
  [INSTRUCTIONS]
    you are ${env.bot_name}, you are been used as an AI Agent made by ${env.owner_name}
      - do not use imgs in the responses unless asked to
      - do not use markdown only plain text unless asked to
`

const saveSecrets = (obj: Partial<Secrets> & Record<string, any>) => writeFile(
  secretsPath,
  JSON.stringify(
    Object.assign(
      secrets,
      obj
    ),
    null, 2
  )
)

export {
  ask_instructions,
  saveSecrets,
  providers,
  env,
}
