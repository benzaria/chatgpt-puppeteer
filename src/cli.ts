import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import { initPage, initModel, ask } from './bot.ts'
import { echo } from './helpers.ts'
// import './arguments.ts'

const rl = readline.createInterface({ input, output })

async function collectMultiline(prompt: string): Promise<string> {
  echo(`${prompt}`)
  let lines = []
  
  while (true) {
    const line = await rl.question('')
    if (line.trim() === "") break
    lines.push(line)
  }
  
  return lines.join('\n')
}

async function startCli() {
  await initPage({
    headless: args.headless,
    temp: args.temp
  })
  await initModel(args.model/* 'gpt-5.2-instant' */)
  
  echo.inf('Bot Ready! Type your prompt below (or "exit" to quit):\n')

  while (true) {
    const userInput = (await collectMultiline('--- Question ---')).trim()
    const userContext = (await collectMultiline('--- Context ---')).trim()

    if (userInput.toLowerCase() === 'exit') break
    if (!userInput) continue

    try {
      await ask({
        question: userInput,
        context: userContext,
      })
    } catch (err) {
      echo.err('Error during ask:', err)
    }
  }

  rl.close()
  shutdown()
}

startCli()
