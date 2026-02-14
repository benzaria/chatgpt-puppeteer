import { readFile, writeFile } from 'node:fs/promises'
import { push, reply, type Actions } from './actions.ts'
import { echo } from '../../utils/helpers.ts'

const file_actions = {
    async write() {
    const { action, path, content } = this

    echo.cst([32, action], path)
    reply(this, content)
    
    await writeFile(path, content, 'utf-8')
      .then(() => reply(this, `*[WRITE]* \`${path}\``))
      .catch((err: Error) => push(
        {
          ...this,
          action: "error",
          error: "EXECUTION_FAILED",
          details: err.message,
        }
      ))
  },

  async read() {
    const { action, path } = this

    echo.cst([32, action], path)

    await readFile(path, 'utf-8')
      .then(result => push(
        {
          ...this,
          result,
          action: 'result',
          action_was: {
            action,
            path
          }
        }
      ))
      .catch((err: Error) => push(
        {
          ...this,
          action: 'error',
          error: "EXECUTION_FAILED",
          details: err.message,
        }
      ))
  },
} as const satisfies Partial<Actions & {none: VoidFn}>

export { file_actions }
