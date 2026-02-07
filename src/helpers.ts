import '@benzn/to-ms/extender'
import config from './config.ts'

const isBrowser = globalThis.window?.document !== undefined
const delay = (ms: number = '2'.s) => new Promise<void>(res => setTimeout(res, ms))
const voidFn = () => { }

const echoMap = {
  inf: [94, console.log],
  wrn: [93, console.warn],
  err: [91, console.error],
  trw: [35, (...args: any[]) => {
    throw new Error(...args)
  }]
} as const

const echo = new Proxy(
  voidFn as {
    (...args: any[]): void
    inf(...args: any[]): void
    wrn(...args: any[]): void
    err(...args: any[]): void
    trw(msg?: string, opt?: ErrorOptions): never
  },
  {
    apply: (fn, _this, args) => console.log(...args),

    get(fn, prop: keyof typeof echoMap) {
      const [color, method] = echoMap[prop]
      console.log('from echo')
      return prop in echoMap
        ? (...args: any[]) =>
          method(...(isBrowser ? args : args.map(
            arg => ['string', 'number'].includes(typeof arg)
              ? `\x1b[${color}m${arg}\x1b[0m`
              : arg
          )))
        : fn
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
  delay,
  toHTML,
  template,
}
