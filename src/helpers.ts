import { setTimeout } from 'node:timers/promises'
import config from './config.ts'

const delay = setTimeout
const colors = (id: number | string, str: string) => `\x1b[${id}m${str}\x1b[0m`
const ansi256 = (id: number | string, str: string) => colors(`38;5;${id}`, str)
const voidFn: VoidFn = (...args: any[]) => {}

const echoObj = {
    inf: [94, 'INFO'],
    wrn: [93, 'WARN'],
    err: [91, 'ERROR'],
    suc: [32, 'SUCCESS'],
    unk: [35, 'UNKNOWN'],
} as const

type EchoObj = typeof echoObj
type EchoObjProp = keyof EchoObj
type EchoMap = EchoObj[EchoObjProp]
type Echo = {(...args: any[]): void} & Simplify<Record<EchoObjProp, VoidFn>>

const echo = new Proxy(
  console.log as Echo,
  {
    apply: (fn, _this, args) => fn(...args),

    get(fn, prop: EchoObjProp) {
      const [id, str] = echoObj[prop] ?? echoObj.unk
      return prop === 'inf' && !args.verbose ? voidFn
        : (...args: any[]) => fn(`[${colors(`1;${id}`, str)}]`, ...args)
    },
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
  ${toHTML(config.env.instruction(q.model))}
  ${q.context ? `${br}<p>[CONTEXT]</p>\n${toHTML(q.context)}` : ''}
  ${q.question ? `${br}<p>[QUESTION]</p>\n${toHTML(q.question)}` : ''}
`.trim()

export {
  echo,
  colors,
  ansi256,
  delay,
  toHTML,
  template,
}
