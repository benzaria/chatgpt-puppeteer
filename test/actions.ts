import { actions } from "../src/agent/actions/actions.ts";

actions.execute.apply({
    action: "execute",
    command: "(await import('process')).platform"
})
