import {
  readdir,
  readFile,
  writeFile,
  constants,
  copyFile,
  unlink,
  access,
  rename,
  mkdir,
  stat,
  cp,
  rm,
} from 'node:fs/promises'
import { push, reply, type Actions, type ActionsType } from './actions.ts'
import { echo } from '../../utils/helpers.ts'

const error = (ctx: ActionsType, err: Error) => {
  push(
    {
      ...ctx,
      action: "error",
      error: "EXECUTION_FAILED",
      details: err.message,
    }
  )
}

const file_actions = {

  async exists() {
    const { action, path, keywords = [] } = this

    echo.cst([34, action], path)

    const lKeywords: string[] = keywords
      .map((key: string) => key.toLowerCase())

    await readdir(path)
      .then(async files => {
        const result = files.filter(
          file => (
            lKeywords.filter(
              (key: string) => file
                .toLowerCase().includes(key)
            )
          ).length
        )

        push(
          {
            ...this,
            result,
            action: 'result',
            action_was: {
              action,
              path,
              keywords
            }
          }
        )
      })
      .catch((err: Error) => error(this, err))
    
    
  },

  async mkdir() {
    const { action, path, recursive = true } = this

    echo.cst([34, action], path)

    await mkdir(path, { recursive })
      .then(() => reply(this, `*[MKDIR]* \`${path}\``))
      .catch((err: Error) => error(this, err))
  },

  async write() {
    const { action, path, content } = this

    echo.cst([32, action], path)
    reply(this, content)

    await writeFile(path, content, 'utf-8')
      .then(() => reply(this, `*[WRITE]* \`${path}\``))
      .catch((err: Error) => error(this, err))
  },

  async read() {
    const { action, path } = this

    echo.cst([32, action], path)

    await stat(path)
      .then(async info => {
        let result: string | string[]

        if (info.isDirectory())
          result = await readdir(path, 'utf-8')
        else
          result = await readFile(path, 'utf-8')

        push({
          ...this,
          result,
          action: 'result',
          action_was: {
            action,
            path
          }
        })
      })
      .catch((err: Error) => error(this, err))
  },

  async delete() {
    const { action, path, recursive = true, force = true } = this

    echo.cst([31, action], path)

    await stat(path)
      .then(async info => {
        if (info.isDirectory())
          await rm(path, { recursive, force })
        else
          await unlink(path)

        reply(this, `*[DELETE]* \`${path}\``)
      })
      .catch((err: Error) => error(this, err))
  },

  async copy() {
    const { action, from, to, recursive = true } = this

    echo.cst([33, action], `${from} → ${to}`)

    await stat(from)
      .then(async info => {
        if (info.isDirectory())
          await cp(from, to, { recursive })
        else
          await copyFile(from, to)

        reply(this, `*[COPY]* \`${from}\` → \`${to}\``)
      })
      .catch((err: Error) => error(this, err))
  },

  async move() {
    const { action, from, to } = this

    echo.cst([33, action], `${from} → ${to}`)

    await rename(from, to)
      .then(() => reply(this, `*[MOVE]* \`${from}\` → \`${to}\``))
      .catch((err: Error) => error(this, err))
  },

} as const satisfies Actions

export { file_actions }