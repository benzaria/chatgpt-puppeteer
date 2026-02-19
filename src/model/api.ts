import { initPage, initModel, chat, initProvider } from './bot.ts'
import { main } from '../agent/instructions.ts'
import { echo } from '../utils/tui.ts'

// @ts-expect-error Could not find a declaration file for module 'body-parser'.
import bodyParser from 'body-parser'
import express from 'express'


const app = express()
const PORT = args.port

app.use(bodyParser.json())

app.post('/chat', async (req, res) => {

	const prompt = req.body as {request: string}[]
	echo.vrb([94, 'REQUEST'], prompt)

	try {
		const resBody = await chat(prompt)
		res.json(resBody)

	} catch (error) {
		echo.err('API Error:', error)
		res.status(500).json({ error: { message: 'Internal Server Error' } })
	}
})

async function startAPI() {
	try {
		await initPage(args.headless)
		await initProvider('openai/gpt-5-mini')
		await initModel(main)

		app.listen(PORT, () => {
			echo(`✅ OpenAI-compatible API running at http://localhost:${PORT}`)
		})
	} catch (err) {
		echo.err('Initialization failed:', err)
		shutdown()
	}
}

if (import.meta.main) startAPI()

export {
	startAPI
}
