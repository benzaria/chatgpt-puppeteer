
type Instructions = {
  [x: string]: any
  actions: {
    [x: string]: any
    name: string
    description: string
    structure: {
      [x: string]: any
      action: string
    }
    rules: string[]
  }[]
}

export type {
    Instructions
}

const string: string = 'string'
const stringArr: string[] = [string]
const code = string as never

export {
    code,
    string,
    stringArr,
}

