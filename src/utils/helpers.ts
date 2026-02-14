import { ask_instructions } from './config.ts'

const colors = (id: number | string, str: string) => `\x1b[${id}m${str}\x1b[0m`
const ansi256 = (id: number | string, str: string) => colors(`38;5;${id}`, str)

const voidFn = function (...args: AnyArray | [AnyFunction]) {
  if (args?.length === 1 && typeof args[0] === 'function') args[0]()
}

function queue<P extends AnyArray, R>(fn: AsyncFn<P, R>) {
  let Q: Promise<any> = Promise.resolve()

  const queued = (...args: P): Promise<R> => {
    const result = Q.then(() => fn(...args)) // fn returns Promise<R>
    Q = result.catch(() => {}) // keep queue alive if fn throws
    return result // promise resolves with fn's value
  }

  queued.idle = (): Promise<void> => Q.then(() => {})

  return queued
}

function lazy<T>(factory: () => Promise<T>) {
  let P: Promise<T> | null = null

  return function get(): Promise<T> {
    return P ??= factory()
  }
}

function delay(timeout?: number, callback?: AnyFunction) {
  return callback
    ? void setTimeout(callback, timeout) as void
    : new Promise(res => delay(timeout, res)) as Promise<void>
}

type EchoMap = typeof echoMap
type EchoLvl = keyof EchoMap
type EchoLvlc = 'cst' | 'vrb'

type EchoTuple =
  | EchoMap[EchoLvl]
  | readonly [id: number, str: string]

type EchoFn = (...args: AnyArray) => () => void

type EchoFnc =
  (level: EchoLvl | EchoTuple, ...args: AnyArray) => () => void

type EchoErr = {
  (...args: AnyArray): () => void
  (err: Error, showFullError?: boolean): () => void
}

type WithMap = typeof withMap
type WithProp = keyof WithMap

type WithLine<T> = T & {
  [K in WithProp]: T
}

type Echo =
  & EchoFn
  & {
    err: WithLine<EchoErr>
  }
  & {
    [K in Exclude<EchoLvl, 'err'> | WithProp]:
      WithLine<EchoFn>
  }
  & {
    [K in EchoLvlc]:
      WithLine<EchoFnc>
  }

const cache = new Map<PropertyKey, any>()

const echoMap = {
  inf: [94, 'INFO'],
  wrn: [93, 'WARN'],
  err: [91, 'ERROR'],
  scs: [32, 'SUCCESS'],
  unk: [35, 'UNKNOWN'],

} as const satisfies Record<string, readonly [number, string]>

const withMap = {
  ln: '\n',
  lr: '\x1b[1A\r',
  ld: '\x1b[K',

} as const satisfies Record<string, string>

const echoFn = ([id, str]: [number, string], ...args: AnyArray) =>
  console.log(`${withMap.ld}[${colors(`1;${id}`, str.toUpperCase())}]`, ...args)

const echoLevel = (p: PropertyKey): EchoTuple =>
  (echoMap as any)[p] ?? echoMap.unk

const withLine = <T extends AnyFunction>(fn: T) => {

  (Object.entries(withMap) as AnyArray).forEach(
    ([prop, str]: [WithProp, string]) => {
      ;(fn as any)[prop] = (...args: AnyArray) => fn(...args, str)
    }
  )

  return fn as WithLine<T>
}

const echo = new Proxy(echoFn as Echo,
  {
    apply(_fn, _this, args) {
      console.log(...args, '\x1b[K')
    },

    get(fn, prop) {
      if (cache.has(prop)) return cache.get(prop)

      const level = echoLevel(prop)

      const call = (...args: AnyArray) => fn(level, ...args)

      const fnc = (lvl: EchoLvl | EchoTuple, ...args: AnyArray) =>
        fn(typeof lvl === 'string' ? echoLevel(lvl) : lvl, ...args)

      const fne = (...args: AnyArray) => {
        if (
          Error.isError(args[0]) && (
            (args.length === 1) ||
            (args.length === 2 && typeof args[1] === 'boolean')
          )
        ) {
          const [err, full] = args
          return fn(level, full ? err : err.message)
        }

        return fn(level, ...args)
      }

      const out =
        prop === 'cst' ? fnc :
        prop === 'err' ? fne :
        
        prop === 'vrb' ? args?.verbose ? fnc : voidFn :
        prop === 'inf' && !args?.verbose ? voidFn :

        call

      const wrapped = withLine(out)
      
      return cache.set(prop, wrapped), wrapped
    }
  }
)

const toHTML = (text?: string) => {
  return text ? text
    .trim() // Remove trailing empty lines
    .split(/\r?\n/) // Split by any newline format
    .map(line => {
      // Escape special characters for security
      const safeLine = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');

      // Wrap in <p> tag. Use &nbsp; if the line is empty so it takes up space.
      return `<p>${safeLine.trim() === '' ? '&nbsp;' : safeLine}</p>`;
    })
    .join('') : ''
}

const template = (q: Query, br: string = '<br>--------------------------------------------------<br>\n') => `
  ${toHTML(ask_instructions())}
  ${q.context ? `${br}<p>[CONTEXT]</p>\n${toHTML(q.context)}` : ''}
  ${q.question ? `${br}<p>[QUESTION]</p>\n${toHTML(q.question)}` : ''}
`.trim()

export {
  echo,
  echoMap,
  colors,
  ansi256,
  queue,
  lazy,
  delay,
  toHTML,
  template,
  voidFn,
}
