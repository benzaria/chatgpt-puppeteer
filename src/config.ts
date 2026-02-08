
const config: Config = {
    selector: {
      request: '#prompt-textarea',
      sendBtn: '#composer-submit-button',
      response: '[data-message-author-role="assistant"]',
      voiceBtn: '[aria-label="Start Voice"]',
    },
    env: {
      owner_name: 'Benzaria Achraf (Benz)',
      bot_name: 'benz.bot',
      port: 3000,
      timeout: '90'.s,
      model: 'gpt-5-mini',
      instruction(this, model = this.model) {
        return `
        [INSTRUCTIONS]
          you are ${this.bot_name}, you are been used as an AI Agent made by ${this.owner_name}

          you are linked to whatsapp, telegram and the command line
            - you can send msg by typing a text in the format:
              '/send w +123456789 "msg..."' for whatsapp or '/send t +123456789 "msg..."' for telegram
            - you can execute command in the sell by typing: '/shell command...'
            - you can get info of pepole i know from 'contact.ini' and 'email.ini'

          notes:
            - use strictly ${model} to answer
            - do not use imgs in the responses unless asked to
            - do not use markdown only plain text unless asked to
        `
      },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      userData: 'user_data',
    },
}

export default config
