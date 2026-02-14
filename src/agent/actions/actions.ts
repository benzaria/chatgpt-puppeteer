import { type MsgData, jidNormalizedUser } from '../../channels/whatsapp/ws.ts'
import { type Instructions } from '../instructions.ts'
import { parser, runAction } from '../interaction.ts'
import { echo } from '../../utils/helpers.ts'
import { chat } from '../../model/bot.ts'
import { file_actions } from './files.ts'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as FunctionConstructor

type ActionsObj = Instructions['actions']

type ActionsMap = Prettify<{
  [A in ActionsObj[number] as A['name']]: Prettify<
    ValueOf<
      & {
        [S in A['structure'] as string]: {
          [K in keyof S as[S[K]] extends [never] ? K : never]:
          ValueOf<A[`${K & string}_codes` & keyof A]>
        }
      }
      & {
        [S in A['structure'] as string]: {
          [K in keyof S as[S[K]] extends [never] ? never : K]: S[K]
        }
      }
    >
  >
}>

type ActionsType = ValueOf<{
  [K in keyof ActionsMap]: Prettify<
      & MsgData
      & ActionsMap[K]
      & { response: string }
    >
}>

type Actions = {
  [K in keyof ActionsMap]: (this: Prettify<
      & MsgData
      & ActionsMap[K]
      & {
        response: string
        readonly output: unknown
      }
    >
  ) => unknown
}

const reply = (
  { uJid, gJid }: { uJid: string, gJid?: string },
  text: string,
  mentions: string[] = []
) => {
  echo.cst([32, 'reply'], { to: gJid ?? uJid, text })
  
  const fnc = async () => await ws.send(gJid ?? uJid, { text, mentions })
  return fnc()
}

const push = async (data: {
  action: 'result'
  result: unknown
  request: string
  response: string
  action_was: Partial<ActionsType>
} | {
  action: 'error',
  error: ThisParameterType<Actions['error']>['error']
  details?: string,
  suggested_fix?: string,
  missing_fields?: string[],
}) => {

  if (data.action === 'result') {
    echo.scs(data.result)
    parser({
      ...data as any,
      response: await chat({
        action: "returning_results",
        context: {
          request_was: data.request,
          response_was: data.response,
        },
        result: data.result
      })
    })
  }
  else if (data.action === 'error') {
    runAction(data as any)
  }
  else {
    echo.err('unknown action:', (data as any).action )
  }
}

const actions = {
  ...file_actions,

  none() {
    echo.vrb.ln([32, 'none'])
  },

  talk() {
    const { action, text } = this
    echo.cst.ln([32, action], '\n' + text)
    reply(this, text)
  },

  async messenger() {
    const {
      action,
      platform,
      mentions,
      message,
      to, uJid, gJid,
    } = this

    const target = jidNormalizedUser(to)
    const toMention = `@${target.split('@')[0]}`
    const _mentions = [...mentions, target]
    
    echo.cst([32, action], { to, uJid, gJid, mentions }, '\n' + message)

    ws.send(
      target,
      {
        text: message,
        mentions: _mentions,
      }
    )

    if (![gJid, uJid].includes(target)) {
      if (gJid) reply(this, `${platform} -> ${toMention}`, _mentions)
      else reply(this, `${platform} -> ${toMention}\n${message}`, _mentions)
    }
  },

  status() {
    const { action, state, details } = this

    echo.cst([32, action], state)
    echo.ln(details)
    reply(this, `*[STATUS]* \`${state}\`\n${details}`)
  },

  error() {
    const {
      action,
      error,
      details,
      missing_fields,
      suggested_fix,
    } = this

    const msg = `*[ERROR]* \`${error}\`${
      details ? `\nReason: ${details}\n` : ''
    }${
      missing_fields?.length
        ? `\n\rMissing fields:\n\r    ${missing_fields.join(',\n    ')}\n`
        : ''
    }${
      suggested_fix ? `\nSuggested fix: ${suggested_fix}` : ''    
    }`.trim()

    echo.cst.ln([32, action], msg)
    reply(this, msg)
  },

  async execute() {
    const { action, command } = this

    echo.cst.ln([32, action], command)
    await (new AsyncFunction(command)() as Promise<unknown>)
      .then(result => push(
        {
          ...this,
          result,
          action: 'result',
          action_was: {
            action,
            command
          }
        }
      ))
      .catch((err: Error) => push(
        {
          ...this,
          action: 'error',
          error: "EXECUTION_FAILED",
          details: err.message,
        }
      ))

  },

  calculate() {
    const { action, expression } = this

    const result = new Function(`return (${expression})`)()
    const msg = `${expression} = *${result}*`

    echo.cst.ln([32, action], msg)
    reply(this, msg)
  },

  web_search() {
    const { action, result } = this

    echo.cst.ln([32, action], '\n' + result)
    reply(this, `*[WEB SEARCH]*\n${result}`)
  },

} as const satisfies Partial<Actions & {none: VoidFn}>


export {
  actions,
  reply,
  push,
}

export type {
  ActionsType,
  Actions,
}
