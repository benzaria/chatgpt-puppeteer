
import { Page } from "puppeteer";

declare global {
    var page: Page
    var model: Model
    var shutdown: () => void

    type Simplify<T> = {[K in keyof T]: T[K]} & {}
    type VoidFn = (...args: any[]) => void

    type Config = {
        selector: Record<string, string>
        env: {
            owner_name: string
            bot_name: string
            port: number
            timeout: number
            model: Model
            userAgent: string
            instruction: (model?: Model) => string
        }
    } & Record<any, any>

    type Model =
        | 'gpt-5-mini'
        | 'gpt-5.2-auto'
        | 'gpt-5.2-instant'
        | 'gpt-5.2-thinking'

    type Query = {
        model?: Model
        context: string
        question?: string
    } | {
        model?: Model
        context?: string
        question: string
    }
}
