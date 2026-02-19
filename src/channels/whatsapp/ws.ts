import {
	createWASocket,
	type CreateSocketOpts,
	type WS,
} from './wa-socket.ts'

import {
	jidNormalizedUser,
	isJidBroadcast,
	isJidGroup,
	isLidUser,
	isPnUser,
	type WAMessage,
} from 'baileys'

import { reply as auto_reply } from '../../agent/actions/consts.ts'
import { queue, delay } from '../../utils/helpers.ts'
import { parser } from '../../agent/interaction.ts'
import { Color, echo } from '../../utils/tui.ts'
import { env } from '../../utils/config.ts'
import { chat } from '../../model/bot.ts'
import { inspect } from 'node:util'

type MsgData = Prettify<
	& HandlerData
	& {
		gJid?: string
	}
>

type HandlerData = {
	msg: WAMessage
	uJid: string
	request: string
	mentions?: string[]
}

async function initWASocket(
	opts?: CreateSocketOpts | null,
	callback?: SyncFn<[ws?: WS]>
) {
	global.ws = await createWASocket(opts ?? {
		logger: 'none',
		printQr: true,

		onQr(qr) {
			echo('Received QR string length:', qr.length)
		}
	}, initWASocket)

	await connection()
		.then(callback ?? initListeners)
		.catch(echo.err)

	return global.ws
}

const connection = () => new Promise((res: (value: WS) => void) => {
	ws.ev.on('connection.update', function ({ connection }) {
		if (connection === 'open') res(global.ws)
	})
})

function initListeners(ws: WS = global.ws) {

	ws.ev.on('messages.upsert', async ({ messages, type }) => {
		if (type !== 'notify') return

		for (const msg of messages) {
			// ignore bot messages and broadcasts
			if (msg.key.fromMe || isJidBroadcast(msg.key.remoteJid!)) continue

			const { message, key } = msg

			// Get message uJid
			const uJid = jidNormalizedUser(key.remoteJidAlt || key.remoteJid!)
			const request =  message?.conversation || message?.extendedTextMessage?.text || ''
			const mentions = message?.extendedTextMessage?.contextInfo?.mentionedJid || undefined

			const isp = args.verbose && inspect(msg,
				{
					depth: null,
					colors: true
				}
			)

			const data = {
				msg,
				uJid,
				request,
				mentions
			}

			if (isJidUser(uJid)) {
				echo.vrb([Color.BG_GREEN, 'user'], isp)
				userHandler.apply(data)
			}
			else if (isJidGroup(uJid)) {
				echo.vrb([Color.BG_GREEN, 'group'], isp)
				groupHandler.apply(data)
			}

		}
	})

	//? ws.ev.on('')

}

async function userHandler(this: HandlerData) {
	// const { msg: { message } } = this

	await reply(this)
}

async function groupHandler(this: HandlerData) {
	const { uJid, msg: { key }, request, mentions } = this
	const lRequest = request.toLowerCase()

	if (!(
		mentions?.includes(env.agent_lid) ||
		lRequest.includes('@' + env.agent_name.toLowerCase()) ||
		lRequest.includes('@' + getID(env.agent_lid)) ||
		lRequest.includes('@' + getID(env.agent_jid))
	)) return

	const participant = jidNormalizedUser(key?.participant || key?.participantAlt)

	const data = {
		...this,
		gJid: uJid,
		uJid: participant,
	}

	await reply(data)
}

const reply = queue(
	async function (data: MsgData) {
		const { uJid, gJid, msg: { key, message }, request, mentions } = data
		const quoted = message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || undefined

		// Mark as Read
		ws.readMessages([key!])

		// Handle ping/pong
		if (request.toLowerCase() === 'ping') {
			auto_reply({ uJid }, 'pong 🏓')
			return
		}

		// Mark as Typing
		const typing = startTyping(uJid)

		// Handle chat and parser
		const response = await chat({
			request,
			chat: gJid,
			from: uJid,
			mentions,
			quoted,
		})

		parser({ ...data, response })
			.finally(typing.stop)
	}
)

function startTyping(jid: string, interval = '.5'.s, timeout = '5'.s) {

	const start = () => {
		ws.sendPresenceUpdate('composing', jid)
		echo.vrb([Color.BR_GREEN, 'typing'], 'started')
		global.typing = timeout
	}

	const stop = () => {
		clearInterval(id)
		ws.sendPresenceUpdate('paused', jid)
		!global.typing || echo.vrb([Color.BR_GREEN, 'typing'], 'stoped')
		global.typing = 0
	}

	const id = setInterval(() => {
		if (global.typing <= 0 || !global.typing) start()
		global.typing -= interval
	}, interval)

	delay('2'.m, stop)

	return { stop }
}

const isJidUser = (jid?: string) => isLidUser(jid) || isPnUser(jid)
const getID = (jid: string) => +jidNormalizedUser(jid).split('@')[0]

export {
	initListeners,
	initWASocket,
	connection,
	getID,
}

export type {
	MsgData
}

export * from 'baileys'
export * from './wa-socket.ts'
