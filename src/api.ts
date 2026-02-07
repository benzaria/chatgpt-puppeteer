import express from 'express'
//@ts-ignore
import bodyParser from 'body-parser'
import { initPage, initModel, ask } from './bot.ts'
import { echo } from './helpers.ts'
import config from './config.ts'

const app = express()
const PORT = config.env.port

app.use(bodyParser.json())

// --- ENDPOINT: List Models (Important for UI compatibility) ---
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      { id: 'benz-bot', object: 'model', created: Date.now(), owned_by: 'system' }
    ]
  })
})

// --- ENDPOINT: Chat Completions (The 'Brain' endpoint) ---
app.post('/v1/chat/completions', async (req, res) => {
  const { messages, model } = req.body

  // 1. Extract the last user message
  const lastUserMessage = messages
    .filter((m: any) => m.role === 'user')
    .pop()?.content || 'Hello'

  echo(`[OpenClaw Request] -> ${lastUserMessage}`)

  try {
    // 2. Call your Puppeteer-based 'ask' function
    const aiResponse = await ask({
      question: lastUserMessage,
      context: 'Act as an OpenAI-compatible API backend for OpenClaw.'
    })

    // 3. Format response to match OpenAI's schema
    const responseBody = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model || 'benz-bot',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: aiResponse
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    }

    res.json(responseBody)
  } catch (error) {
    echo.err('API Error:', error)
    res.status(500).json({ error: { message: 'Internal Server Error' } })
  }
})

// Start the browser first, then the server
if (import.meta.main) {
  (async () => {
    await initPage(false)
    await initModel()

    app.listen(PORT, () => {
        echo(`✅ OpenAI-compatible API running at http://localhost:${PORT}/v1\n`)
    })
  })()
}
