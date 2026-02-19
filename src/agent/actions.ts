
export * from './actions/file_system.ts'
export * from './actions/messenger.ts'
export * from './actions/internet.ts'
export * from './actions/system.ts'
export * from './actions/math.ts'

import type { Actions, ActionsType } from './actions/consts.ts'
import { reply, results, error } from './actions/consts.ts'

import { file_system_actions } from './actions/file_system.ts'
import { messenger_actions } from './actions/messenger.ts'
import { internet_actions } from './actions/internet.ts'
import { system_actions } from './actions/system.ts'
import { math_actions } from './actions/math.ts'

const actions = {

	...file_system_actions,
	...messenger_actions,
	...internet_actions,
	...system_actions,
	...math_actions,

} as const satisfies Actions

export { actions, reply, results, error }
export type { Actions, ActionsType }
