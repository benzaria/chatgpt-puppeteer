import './arguments.ts'

import { initWASocket } from '../channels/whatsapp/ws.ts'
import { parser } from '../agent/interaction.ts'
import { initBot } from '../model/bot.ts'
import { initCLI } from './chat_tui.ts'

async function initAgent() {

	global.isCLI = true

	await initWASocket()
	await initBot()
	await initCLI(parser)
	shutdown()

}

initAgent()

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', shutdown)
