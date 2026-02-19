import { writeFile } from 'node:fs/promises'
import { echo } from '../../../utils/tui.ts'
import { env } from '../../../utils/config'
import { pathToFileURL } from 'node:url'
import { getID } from '../ws.ts'
import { join } from 'path'

`
	BEGIN:VCARD
	VERSION:3.0
	N:Last;Prefix First;Middle;;Suffix
	FN:Prefix First Middle Last, Suffix
	TEL;type=Mobile;waid=123456789:+123 456-789
	END:VCARD
`

const contactPath = join(env.cwd, 'agent-files/contact.json')

const getContact = (vcard: string) => {
	const match = vcard.match(/FN:(.+)[\s\S]*waid=(\d+)/) || []

	return { name: match[1].toLowerCase(), jid: +match[2] }
}

async function loadContact() {
	const imp = async (path: string) => (
		await import(
			pathToFileURL(path).href,
			{ with: { type: 'json' } }
		)
	).default

	try {
		return global.contacts = await imp(contactPath)
	} catch {
		echo.wrn(`Contacts are not setup at: "${contactPath}"`.replaceAll('\\', '/'))

		global.contacts = {
			[env.agent_name.toLowerCase()]: getID(env.agent_jid)
		}

		saveContact()
	}
}

async function saveContact(vcard?: string) {

	if (vcard) {
		const { name, jid } = getContact(vcard)
		Object.assign(
			contacts,
			{
				[name]: jid
			}
		)
	}

	writeFile(
		contactPath,
		JSON.stringify(
			contacts,
			null, 2
		)
	).catch(echo.err)
}

global.contacts = await loadContact()

export {
	loadContact,
	saveContact,
	getContact,
}
