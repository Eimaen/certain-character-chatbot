const axios = require('axios').default;
const { openai } = require('../config.json');
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
    apiKey: openai.token
});
const openaiClient = new OpenAIApi(configuration);

const usernameReplacements = {
    '303786287029157888': 'Walter Hartwell White, the meth dealer'
};

/**
 * Generate the following message based on previous ones.
 * @param {Message[]} context 
 * @returns {string} Generated message.
 */
const generateMessage = async (context) => {
    const response = await openaiClient.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: openai.system
            },
            ...context.map(message => ({ role: message.client.user.id == message.author.id ? 'assistant' : 'user', content: `${message.client.user.id == message.author.id ? '' : ((usernameReplacements[message.author.id] ?? message.author.toString()) + ': ')}${message.content.replace(message.client.user.toString(), 'Cirno')}` }))
        ],
        max_tokens: 128,
        frequency_penalty: 0.5,
        presence_penalty: 0.1,
        temperature: 0.7,
        top_p: 1,
    }).catch(_ => null);
    if (response && response.data)
        return response.data.choices[0].message.content;
    else
        return null;
}

/**
 * Complete a text.
 * @param {string} text
 * @returns {string} Completion.
 */
const completeText = async (text) => {
    const response = await openaiClient.createCompletion({
        model: "text-davinci-003",
        prompt: text,
        temperature: 0.7,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
    }).catch(_ => null);
    if (response && response.data)
        return response.data.choices[0].text;
    else
        return null;
}

module.exports = { generateMessage, completeText };