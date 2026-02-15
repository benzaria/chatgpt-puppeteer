import { parseArgs, type ParseArgsOptionsConfig } from 'node:util'
import { echo } from '../utils/helpers.ts'
import { env } from '../utils/config.ts'

declare global {
	const args: Prettify<
    Omit<
      Required<typeof values>,
      'headed' | 'model'
    > & {
      headless: boolean | 'new'
      model: Models
    }
  >

  const __args: string[]
}

const options = {

  headed: {
    short: 'h',
    type: 'boolean',
    default: false,
  },

  'new-conv': {
//  short: 'nc',
    type: 'boolean',
    default: false,
  },
  
  'best-conv': {
//  short: 'bc',
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
    default: ''+env.port,
  },

  model: {
    short: 'm',
    type: 'string',
    default: env.model,
  },

} as const satisfies ParseArgsOptionsConfig

const multiShortMap = {
  '-nc': '--new-conv',
  '-bc': '--best-conv',
} as const satisfies Record<`-${string}`, `--${string}`>

const preParseArgv = (argv: string[]) => argv.map(
  arg => (multiShortMap as any)[arg] ?? arg
)

const { values, positionals } = parseArgs({
  args: preParseArgv(process.argv.slice(2)),
  allowPositionals: true,
  options,
})

const _args: typeof args = {...values as any}
delete (_args as any)['headed']
_args.headless = values.headed === true ? false : 'new'

// @ts-ignore
global.args = _args
// @ts-ignore
global.__args = positionals

if (args.verbose) echo('args:', _args)
