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

import { reply as auto_reply } from '../../agent/actions/actions.ts'
import { echo, queue, delay } from '../../utils/helpers.ts'
import { parser } from '../../agent/interaction.ts'
import { env } from '../../utils/config.ts'
import { chat } from '../../model/bot.ts'
import { inspect } from 'node:util'

type MsgData = Prettify<
  & { msg: WAMessage }
  & {
    uJid: string
    gJid?: string
    request: string
    mentions: string[]
  }
>

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

      // Get message uJid
      const uJid = jidNormalizedUser(msg.key.remoteJidAlt || msg.key.remoteJid!)
      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const request = msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'NEVER'

      const isp = args.verbose && inspect(msg,
        {
          depth: 5,
          colors: true
        }
      )

      const data = {
        msg,
        uJid,
        request,
        mentions,
      }

      if (isLidUser(uJid) || isPnUser(uJid)) {
        echo.vrb([94, 'user'], isp)
        userHandler(data)
      }
      else if (isJidGroup(uJid) && (
        mentions.length
          ? mentions.includes(env.bot_lid)
          : request.includes(`@${env.bot_name}`)
      )) {
        echo.vrb([94, 'group'], isp)
        groupHandler(data)
      }

    }
  })

  //? ws.ev.on('')

}

async function userHandler(data: MsgData) {

  await reply(data)
}

async function groupHandler(data: MsgData) {

  const _data = {
    ...data,
    gJid: data.uJid,
    uJid: jidNormalizedUser(data.msg.key?.participant || data.msg.key?.participantAlt),
  }

  await reply(_data)
}

// const qchat = queue(chat)

const reply = queue(
  async function (data: MsgData) {
    const { uJid, gJid, msg: { key, message }, request, mentions } = data
    const quoted = message?.extendedTextMessage?.contextInfo?.quotedMessage ?? undefined

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

function startTyping(jid: string, interval = 500, timeout = 5000) {
  const start = () => {
    echo.inf('typing')
    ws.sendPresenceUpdate('composing', jid)
    global.typing = timeout
  }
  
  const stop = () => {
    clearInterval(id)
    global.typing = 0
    echo.inf('stoped')
    // ws.sendPresenceUpdate('paused', jid)
  }

  const id = setInterval(() => {
    if (global.typing <= 0 || !global.typing) start()
    global.typing -= interval
  }, interval)

  delay(20_000, stop)

  return { stop }
}

export {
  initListeners,
  initWASocket,
  connection,
}

export type {
  MsgData
}

export * from 'baileys'
export * from './wa-socket.ts'

