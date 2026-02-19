import { type MsgData } from '../../channels/whatsapp/ws.ts'
import { parser, runAction } from '../interaction.ts'
import * as instructions from '../instructions.ts'
import { Color, echo } from '../../utils/tui.ts'
import { env } from '../../utils/config.ts'
import { chat } from '../../model/bot.ts'


type ActionsObj = typeof instructions['main']['actions']

type ActionsMap = Prettify<{
  [A in ActionsObj[number] as A['name']]: Prettify<
		A['structure'] extends infer S
			? {
          [K in keyof S as
						IsNever<S[K]> extends true ? K : never
					]: ValueOf<A[`${K & string}_codes` & keyof A]>
        } & {
					[K in keyof S as
						IsNever<S[K]> extends true ? never : K
					]: S[K]
				}
			: never
  >
}>

type ActionsKeys = keyof ActionsMap

type ActionsType = Prettify<
	& MsgData
	& ValueOf<ActionsMap>
	& { response: string }
>

type Actions = {
  [K in ActionsKeys]: (this: Prettify<
      & MsgData
      & ActionsMap[K]
      & {
        response: string
        readonly output: unknown
      }
    >
  ) => unknown | Promise<unknown>
} & { none: VoidFn }

type PActions = Partial<Actions>

const reply = (
	{ uJid, gJid }: { uJid: string, gJid?: string },
	text: string,
	mentions: string[] = []
) => {
	if (isCLI) return

	text = text.replaceAll(env.home, '~')
	echo.vrb([Color.GREEN, 'reply'], { to: gJid ?? uJid, text })

	return ws.send(gJid ?? uJid, { text, mentions })
}

const error = (ctx: ActionsType, err: Error) => {
	echo.err(err.message)

	return runAction({
		...ctx as any,
		action: 'error',
		error: 'EXECUTION_FAILED',
		details: err.message,
	})
}

const results = async (data: {
  result: unknown
  request: string
  response: string
  action_was: Partial<ActionsType>
}) => {
	echo.scs.ln(data.result)

	return parser({
		...data as any,
		response: await chat({
			action: 'result',
			// context: {
			// 	request_was: data.request,
			// 	response_was: data.response,
			// },
			result: data.result
		})
	})
}

export {
	results,
	reply,
	error,
}

export type {
	ActionsType,
	Actions,
	PActions,
}
