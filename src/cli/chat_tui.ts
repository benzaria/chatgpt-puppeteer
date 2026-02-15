import { createInterface } from 'node:readline/promises'
import { initBot, chat } from '../model/bot.ts'
import { stdin, stdout } from 'node:process'
import { echo } from '../utils/helpers.ts'

const rl = createInterface({ input: stdin, output: stdout })

async function collectPrompt(prompt: string): Promise<string> {
  echo(`${prompt}`)
  let lines = []

  while (true) {
    const line = await rl.question('')
    if (line.trim() === "") break
    lines.push(line)
  }

  return lines.join('\n')
}

async function startCLI(callback?: (...args: any[]) => any) {
  //- await initPage(args.headless)
  //- await initProvider(args.model)
  //- await initModel(instructions)
  await initBot()

  echo.inf('\nBot Ready! Type your prompt below (or "exit" to quit):')
  let prompt, response

  while (true) {
    prompt = (await collectPrompt('--- Request ---')).trim()

    if (prompt.toLowerCase() === 'exit') break
    if (!prompt) continue

    try {
      response = await chat({request: prompt})
    } catch (err) {
      echo.err('Error during ask:', err)
    }

    callback ? callback(prompt, response) : null
  }

  rl.close()
  shutdown()
}

if (import.meta.main) startCLI()

export {
  startCLI
}
