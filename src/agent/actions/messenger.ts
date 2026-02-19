import { getID } from '../../channels/whatsapp/ws.ts'
import { reply, type PActions } from './consts.ts'
import { Color, echo } from '../../utils/tui.ts'

const messenger_actions = {

	messenger() {
		const {
			action,
			platform,
			mentions,
			message,
			to, uJid, gJid,
		} = this

		const target = `@${getID(to)}`
		const _mentions = [...mentions ?? [], to]

		echo.cst([Color.GREEN, action], { to, uJid, gJid, mentions }, '\n' + message)

		if (![gJid, uJid].includes(to)) {
			if (gJid) reply(this, `${platform} -> ${target}`, _mentions)
			else reply(this, `${platform} -> ${target}\n${message}`, _mentions)
		}

		return ws.send(to,
			{
				text: message,
				mentions: _mentions,
			}
		)
	},

} as const satisfies PActions

export { messenger_actions }
