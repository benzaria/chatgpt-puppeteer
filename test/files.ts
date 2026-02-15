import { readdir } from "node:fs/promises"

await readdir('../agent-files')
  .then(async files => {
    const result = files.filter(file => (['internet'].filter((key) => file.includes(key))).length)
    console.log(result)
   })

  