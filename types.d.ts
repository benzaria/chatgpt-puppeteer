
import type { WS } from './src/channels/whatsapp/wa-socket.ts'
import type { Page, Browser } from 'puppeteer'

type __providers = typeof import('./src/utils/config.ts').providers
type __personas = typeof import('./src/agent/instructions.ts')

declare global {

  var isCLI: boolean
  var shutdown: AsyncFn<never, never>
  var browser: Browser
  var page: Page
  var provider: Providers
  var model: LLMs
  var persona: Personas
  var instructions: object
  var ws: WS
  var typing: number
  var contacts: Record<string, number>

  type Prettify<T> = {[K in keyof T]: T[K]} & {}
  type Literal<T extends U, U> = T | (U & Prettify<{}>)
  type ValueOf<T> = T extends AnyArray ? T[number] : T[keyof T]

  type Promisify<T extends AnyFunction> =
    T extends (this: infer T, ...args: infer P) => infer R
      ? SyncFn<P, Promise<R>, T>
      : never

  type IsNever<T> = [T] extends [never] ? true : false
  type IsAny<T> = 0 extends (1 & T) ? true : false

  type IsUnknown<T> =
    IsAny<T> extends false
      ? unknown extends T
        ? [T] extends [unknown]
          ? true
          : false
        : false
      : false

  type SyncFn<P extends AnyArray = [], R = void, T = unknown> =
    (IsNever<P> extends true ? [] : P) extends infer P extends AnyArray
      ? IsUnknown<T> extends true
        ? (...args: P) => R
        : (this: T, ...args: P) => R
      : never

  type AsyncFn<P extends AnyArray = [], R = void, T = unknown> = SyncFn<P, Promise<R>, T>
    
  type _ = '_'
  type VoidFn = (...args: AnyArray) => void
  type AnyArray = readonly any[]
  type AnyRecord = {[x in any]: any}
  type AnyFunction = (...args: AnyArray) => any
  type EmptyObject = {}
  type EmptyArray = readonly []

  type Providers = keyof __providers
  type Personas = Exclude<keyof __personas, 'instructions'>
  type LLMs = __providers[Providers]['models'][number]
  type Models = {
    [K in Providers]: `${K}/${__providers[K]['models'][number]}`
  }[Providers]

  type Query = {
    context: string
    question?: string
  } | {
    context?: string
    question: string
  }
}
