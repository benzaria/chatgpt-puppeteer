import { stdin as input, stdout as output } from 'node:process'
import * as readline from 'node:readline/promises'
import { initPage, initModel, ask } from './bot.ts'
import { echo } from './helpers.ts'

const rl = readline.createInterface({ input, output })

async function collectMultiline(prompt: string): Promise<string> {
  echo(`${prompt}`)
  let lines = []
  
  while (true) {
    const line = await rl.question('')
    if (line.trim() === "") break
    if (line.toLowerCase() === 'exit') return 'exit'
    lines.push(line)
  }
  
  return lines.join('\n')
}

async function startCli() {
  await initPage(true, false)
  await initModel('gpt-5.2-instant')
  
  echo('\nBot Ready! Type your prompt below (or "exit" to quit):\n')

  while (true) {
    const userInput = await collectMultiline('--- Question ---')
    const userContext = await collectMultiline('--- Context ---')

    if (userInput.toLowerCase() === 'exit') {
      echo('Closing session...')
      break
    }

    if (!userInput.trim()) continue

    try {
      await ask({
        question: userInput,
        context: userContext.trim()
      })
    } catch (err) {
      echo.err('Error during ask:', err)
    }
  }

  rl.close()
  process.exit(0)
}

startCli()
