import { actions, push, type ActionsType } from './actions.ts'
import { type MsgData } from '../channels/whatsapp/ws.ts'
import { echo } from '../utils/helpers.ts'
import { env } from '../utils/config.ts'

async function parser(data: MsgData & { response: string }) {
  const { response } = data

  try {
    const resJSON = JSON.parse(response)

    if (Array.isArray(resJSON)) {
      resJSON.reduce(
        async (output: AnyArray, action: ActionsType, index) => {
          echo.vrb([94, 'action'], action, '\n')
          
          return await runAction({ ...data, ...action}, output, index)
        },
        undefined
      )
    }
    else {
      await runAction({ ...data, ...resJSON})
    }

  } catch (err) {
    if (Error.isError(err) && err.message.includes('is not valid JSON')) {
      runAction({
        ...data,
        action: "talk",
        text: response,
      })
    }
    else {
      echo.err(err)
    }
  }
}

async function runAction(
  data: ActionsType,
  output?: AnyArray,
  index?: number
): Promise<void> {
  const { action, uJid } = data

  if (
    !env.safe_actions.includes(action) &&
    !env.auth_users.includes(uJid)
  ) return push({
    ...data,
    action: 'error',
    error: "UNAUTHORIZED_USER",
    details: `Unauthorized users can NOT preforme '${action}' actions!`,
    suggested_fix: `Ask agent owner '${env.owner_name}' for permission.`,
  })

  const fn = actions[action.toLowerCase() as keyof typeof actions] as AsyncFn<any[], any>

  return fn
    ? fn.apply({ ...data, output })
    : push({
      ...data,
      action: "error",
      error: "UNSUPPORTED_ACTION",
      details: `Requested action '${action}' is not inplemented yet!`,
      suggested_fix: "Write the corresponding TS code to acheive this behavior.",
    })
}

export {
  parser,
  runAction,
}
