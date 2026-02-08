import express from 'express'
//@ts-ignore
import bodyParser from 'body-parser'
import { initPage, initModel, ask } from './bot.ts'
import { echo } from './helpers.ts'
import config from './config.ts'

const app = express()
const PORT = args.port || config.env.port

app.use(bodyParser.json())

// --- ENDPOINT: List Models (Important for UI compatibility) ---
app.get('/v1/models', (req, res) => {
  res.json({
    object: 'list',
    data: [
      { 
        id: 'benz-bot', 
        object: 'model', 
        created: Math.floor(Date.now() / 1000), 
        owned_by: 'library'
      }
    ]
  })
})

// --- ENDPOINT: Chat Completions (The 'Brain' endpoint) ---
app.post('/v1/chat/completions', async (req, res) => {
  const { messages, model, stream } = req.body

  // 1. Extract the last user message
  const lastUserMessage = messages
    ?.filter((m: any) => m.role === 'user')
    .pop()?.content.text || 'Hello'

  echo(`[Request] -> ${lastUserMessage}`)

  try {
    // 2. Call your Puppeteer-based 'ask' function
    const aiResponse = await ask({
      question: lastUserMessage,
    })

    // 3. Handle Streaming (OpenClaw often requests streams)
    // If stream is true, we send a single chunk then [DONE] to satisfy the client
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const chunk = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: model || 'benz-bot',
        choices: [{
          index: 0,
          delta: { content: aiResponse },
          finish_reason: null
        }]
      };

      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      res.write(`data: [DONE]\n\n`);
      return res.end();
    }

    // 4. Standard Response (Non-streaming)
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
        prompt_tokens: lastUserMessage.length / 4, // Rough estimation
        completion_tokens: aiResponse!.length / 4,
        total_tokens: (lastUserMessage.length + aiResponse!.length) / 4
      }
    }

    res.json(responseBody)
  } catch (error) {
    echo.err('API Error:', error)
    res.status(500).json({ error: { message: 'Internal Server Error' } })
  }
})

if (import.meta.main) {
  (async () => {
    try {
      await initPage({ headless: 'new', temp: false })
      await initModel('gpt-5-mini')

      app.listen(PORT, () => {
        echo(`✅ OpenAI-compatible API running at http://localhost:${PORT}/v1`)
      })
    } catch (err) {
      echo.err("Initialization failed:", err)
      shutdown()
    }
  })()
}
