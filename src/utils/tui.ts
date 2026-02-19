import { voidFn } from './helpers.ts'
import { stdout } from 'node:process'

// Enum exports
export type Ansi = ValueOf<typeof Ansi>
export type Color = Exclude<ValueOf<typeof Color>, AnyFunction>

type JoinFn = {
	(colors: (number | string)): string
	(...colors: (number | string)[]): string
}

const ESC = '\x1b'

const Ansi = {
	ESC,
	CSI: `${ESC}[`, /* \x9B */
	OSC: `${ESC}]`, /* \x9D */
	DCS: `${ESC}P`, /* \x90 */
	BEL: '\x07',
	DEL: '\x7f',

	BS: '\b',
	HT: '\t',
	LF: '\n',
	VT: '\v',
	FF: '\f',
	CR: '\r',

} as const

const Color = {

	join: ((...input: AnyArray) => {

		const codes =
			Array.isArray(input[0])
				? input[0]
				: input

		return codes
			.filter(Boolean)
			.join(';')

	}) as JoinFn,

	// Reset
	RESET: 0,

	// Styles
	BOLD: 1,
	DIM: 2,
	ITALIC: 3,
	UNDERLINE: 4,
	BLINK: 5,
	INVERSE: 7,
	HIDDEN: 8,
	STRIKETHROUGH: 9,

	// Foreground colors
	BLACK: 30,
	RED: 31,
	GREEN: 32,
	YELLOW: 33,
	BLUE: 34,
	MAGENTA: 35,
	CYAN: 36,
	WHITE: 37,

	// Bright foreground colors
	BR_BLACK: 90,
	BR_RED: 91,
	BR_GREEN: 92,
	BR_YELLOW: 93,
	BR_BLUE: 94,
	BR_MAGENTA: 95,
	BR_CYAN: 96,
	BR_WHITE: 97,

	// Background colors
	BG_BLACK: 40,
	BG_RED: 41,
	BG_GREEN: 42,
	BG_YELLOW: 43,
	BG_BLUE: 44,
	BG_MAGENTA: 45,
	BG_CYAN: 46,
	BG_WHITE: 47,

	// Bright background colors
	BG_BR_BLACK: 100,
	BG_BR_RED: 101,
	BG_BR_GREEN: 102,
	BG_BR_YELLOW: 103,
	BG_BR_BLUE: 104,
	BG_BR_MAGENTA: 105,
	BG_BR_CYAN: 106,
	BG_BR_WHITE: 107,
} as const

const color = (id: Color[] | Color | string, str: string) =>
	`${Ansi.CSI}${typeof id === 'string' ? id : Color.join(id as any)}m${str}${Ansi.CSI}0m`

const color256 = (id: number | string, str: string) => color(`38;5;${id}`, str)

type EchoLevel = keyof EchoMap
type EchoMap = typeof echoMap
type EchoLvlc = 'cst' | 'vrb'

type EchoTupleType = readonly [id: Color[] | Color, str: string]
type EchoTuple =
	| EchoTupleType
	| EchoMap[EchoLevel]

type EchoFn = (...args: AnyArray) => () => void

type EchoFnc =
	(level: EchoLevel | EchoTuple, ...args: AnyArray) => () => void

type EchoErr = {
	(...args: AnyArray): () => void
	(err: Error, showFullError?: boolean): () => void
}

type WithMap = typeof withMap
type WithProp = keyof WithMap

type WithLine<T> = T & {
	[K in WithProp]: T
}

type Echo =
	& WithLine<EchoFn>
	& {
		err: WithLine<EchoErr>
	}
	& {
		[K in Exclude<EchoLevel, 'err'>]:
		WithLine<EchoFn>
	}
	& {
		[K in EchoLvlc]:
		WithLine<EchoFnc>
	}

const echoCache = new Map<PropertyKey, any>()

const echoMap = {
	inf: [Color.BR_BLUE, 'INFO'],
	wrn: [Color.BR_YELLOW, 'WARN'],
	err: [Color.BR_RED, 'ERROR'],
	scs: [Color.GREEN, 'SUCCESS'],
	unk: [Color.MAGENTA, 'UNKNOWN'],

} as const satisfies Record<string, EchoTupleType>

const withMap = {
	ln: Ansi.LF,
	lr: `${Ansi.CSI}1A${Ansi.CR}`,
	ld: `${Ansi.CSI}K`,

} as const satisfies Record<string, string>

//--- Suppresses internal logs ---
const _write = stdout.write.bind(stdout)
const _log = console.log.bind(console)

const ignoreList = [
	'SessionEntry',       // Baileys session logs
]

stdout.write = (chunk: string | Buffer, encodingOrCallback?: any, callback?: () => void): boolean => {

	const str = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk
	const shouldIgnore = ignoreList.some((ignored) => str.includes(ignored))

	if (shouldIgnore) {

		if (typeof encodingOrCallback === 'function')
			encodingOrCallback()
		else if (callback)
			callback()

		return true
	}

	return _write(chunk, encodingOrCallback, callback)
}

const echoFn = ([id, str]: [Color, string], ...args: AnyArray) =>
	_log(`${withMap.ld}[${color(`1;${id}`, str.toUpperCase())}]`, ...args)

const echoLevel = (p: PropertyKey): EchoTuple =>
	(echoMap as any)[p] ?? echoMap.unk

const withLine = <T extends AnyFunction>(fn: T) => {

	(Object.entries(withMap) as AnyArray).forEach(
		([prop, str]: [WithProp, string]) => {
			;(fn as any)[prop] = (...args: AnyArray) => fn(...args, str)
		},
	)

	return fn as WithLine<T>
}

const echo = new Proxy(echoFn as Echo,
	{
		apply(_, __, args) {
			_log(...args, `${Ansi.CSI}K`)
		},

		get(call, prop: string) {
			if (echoCache.has(prop)) return echoCache.get(prop)

			if (prop in withMap) {
				const fn = (...args: AnyArray) =>
					_log(...args, withMap[prop as WithProp] ?? '')

				return echoCache.set(prop, fn), fn
			}

			const fn = (...args: AnyArray) => call(echoLevel(prop), ...args)

			const fnc = (level: EchoLevel | EchoTuple, ...args: AnyArray) =>
				call(typeof level === 'string' ? echoLevel(level) : level, ...args)

			const fne = (...args: AnyArray) => {
				if (
					Error.isError(args[0]) && (
						(args.length === 1) ||
						(args.length === 2 && typeof args[1] === 'boolean')
					)
				) {
					const [err, full] = args
					return fn(full ? err : err.message)
				}

				return fn(...args)
			}

			const fnv = (..._args: AnyArray) => (args.verbose ? fnc as any : voidFn)(..._args)
			const fni = (..._args: AnyArray) => (args.verbose ? fn : voidFn)(..._args)

			/* eslint-disable indent */
			const out =
				prop === 'err' ? fne :
				prop === 'cst' ? fnc :
				prop === 'vrb' ? fnv :
				prop === 'inf' ? fni :
				fn
			/* eslint-enable indent */

			const wrapped = withLine(out)

			// if (!'inf,vrb'.includes(prop))
			echoCache.set(prop, wrapped)

			return wrapped
		},
	},
)

export {
	echo,
	echoMap,
	color,
	color256,
	Color,
	Ansi,
}
