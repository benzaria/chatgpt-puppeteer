import { parseArgs, type ParseArgsOptionsConfig } from 'node:util'
import { colors } from './helpers.ts'
import config from './config.ts'

declare global {
	const args: Simplify<Omit<Required<typeof values>, 'headless'> & {
    headless: `${boolean}` | boolean | 'new'
    model: Model
  }>
  const pArgs: string[]
  
  const isBrowser: boolean
  const prvLine: string
  const clrLine: string
}

const options = {

  headless: {
    short: 'h',
    type: 'string', 
    default: 'new',
  },

	temp: {
		short: 't',
		type: 'boolean',
		default: false,
	},

	verbose: {
		short: 'v',
		type: 'boolean',
		default: false,
	},

  port: {
    short: 'p',
    type: 'string',
    default: ''+config.env.port,
  },

  model: {
    short: 'm',
    type: 'string',
    default: config.env.model,
  },

} as const satisfies ParseArgsOptionsConfig

const { values, positionals } = parseArgs({ options, allowPositionals: true })

if (values.verbose) console.log(`[${colors(`1;${94}`, 'INFO')}]`, 'args:', {...values}, '\n')

// @ts-ignore
globalThis.args = values
// @ts-ignore
globalThis.pArgs = positionals

// @ts-ignore
globalThis.isBrowser = globalThis.window?.document !== undefined
// @ts-ignore
globalThis.prvLine = values.verbose ? '\x1b[1A\r' : ''
// @ts-ignore
globalThis.clrLine = values.verbose ? '\x1b[K' : ''
