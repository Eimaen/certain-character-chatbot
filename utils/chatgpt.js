const axios = require('axios').default;
const { openai } = require('../config.json');

const usernameReplacements = {
    '303786287029157888': 'Walter Hartwell White, the meth dealer' // Keep it.
};

/**
 * Generate the following message based on previous ones.
 * @param {Message[]} context 
 * @returns {string} Generated message.
 */
const generateMessage = async (context) => {
    let request = {
        model: "gpt-3.5-turbo",
        max_tokens: 128,
        frequency_penalty: 0.5,
        presence_penalty: 0.1,
        temperature: 0.7,
        top_p: 1,
        messages: [
            {
                role: "system",
                content: openai.system
            },
            ...context.map(message => ({ role: message.client.user.id == message.author.id ? 'assistant' : 'user', content: `${message.client.user.id == message.author.id ? '' : ((usernameReplacements[message.author.id] ?? message.author.toString()) + ': ')}${message.content.replace(message.client.user.toString(), 'Cirno')}` }))
        ]
    };
    let response = await axios.post('https://api.openai.com/v1/chat/completions', request, {
        headers: {
            Authorization: `Bearer ${openai.token}`
        },
    }).catch(err => {
        if (err.response)
            console.log(err.response.data);
        return null;
    });
    if (response && response.data)
        return response.data.choices[0].message.content;
    else
        return null;
}

module.exports = { generateMessage };