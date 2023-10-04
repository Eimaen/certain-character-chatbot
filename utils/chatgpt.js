const axios = require('axios').default;
const { openai } = require('../config.json');
const { Configuration, OpenAIApi } = require('openai');
const db = require('./database');
const { encode, decode } = require('gpt-3-encoder');

const configuration = new Configuration({
    apiKey: openai.token
});
const openaiClient = new OpenAIApi(configuration);

class OpenAIWrapper {
    constructor(openAiClient) {
        this.openai = openAiClient;
        this.queue = [];
        setInterval(this.tickQueue.bind(this), 5000);
    }

    async tickQueue() {
        const task = this.queue?.shift();
        if (task)
            task();
    }

    /**
     * Generate the following message based on previous ones. Queued version.
     * @param {string} system
     * @param {Message[]} context 
     * @param {string} extra
     * @returns {Promise<{completion: string, context: object}>} Generated message.
     */
    async generateMessageQueued(system, context, extra = '') {
        return await new Promise((resolve) => { this.queue.push(() => { resolve(this.generateMessage(system, context, extra)); }); });
    }

    /**
     * Generate the following message based on previous ones.
     * @param {string} system
     * @param {Message[]} context 
     * @param {string} extra
     * @returns {Promise<{completion: string, context: object}>} Generated message.
     */
    async generateMessage(system, context, extra = '') {
        let messagesFiltered = [], currentTokenCount = 0;
        for (let message of context.reverse()) {
            let dbMessage = db.getMessage(message.id);
            if (dbMessage)
                message.content = dbMessage.content;
            currentTokenCount += encode(message.content).length;
            if (currentTokenCount >= 512)
                break;
            messagesFiltered.push(message);
        }
        messagesFiltered = messagesFiltered.reverse();
        if (messagesFiltered.length == 0)
            messagesFiltered.push(context.at(0));
        if (extra != '') {
            let lastMessage = messagesFiltered.at(-1);
            db.setMessage(lastMessage.id, lastMessage.content + extra);
        }
        const requestData = {
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: system
                },
                ...messagesFiltered.map((message, idx) => ({ role: message.client.user.id == message.author.id ? 'assistant' : 'user', content: `${message.client.user.id == message.author.id ? '' : (db.getUser(message.author.id).name + ': ')}${message.content.replace(message.client.user.toString(), 'Cirno')}${(idx == messagesFiltered.length - 1) ? extra : ''}` }))
            ],
            max_tokens: 256,
            frequency_penalty: 0.5,
            presence_penalty: 0.1,
            temperature: 0.7,
            top_p: 1,
        };
        const response = await this.openai.createChatCompletion(requestData).catch(async err => { 
            if (err.response.data) {
                console.error(err.response.data);
                if (err.response.data?.error?.type == 'server_error')
                    return await this.generateMessage(system, context, extra);
            }
            return null; 
        });
        if (response && response.data)
            return { completion: response.data.choices[0].message.content, context: requestData, tokens: response.data.usage };
        else
            return { completion: null, context: requestData, tokens: null };
    }

    /**
     * Generate Danbooru tags based on the last message. Queued version.
     * @param {string} question
     * @param {string} answer
     * @returns {Promise<string>} Generated message.
     */
    async generateImagePromptQueued(question, answer = 'Here you go! *takes a photo*') {
        return await new Promise((resolve) => { this.queue.push(() => { resolve(this.generateImagePrompt(question, answer)); }); });
    }

    /**
     * Generate Danbooru tags based on the last message.
     * @param {string} question
     * @param {string} answer
     * @returns {Promise<string>} Generated message.
     */
    async generateImagePrompt(question, answer = 'Here you go! *takes a photo*') {
        const response = await this.openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: 'system',
                    content: 'Cirno is asked to take a photo. Answer with comma-separated danbooru tags based on request. If question is not related to photo, answer "..."'
                },
                {
                    role: 'user',
                    content: 'Q: Take a selfie in the lake.\nA: Here you go! *takes a photo*'
                },
                {
                    role: 'assistant',
                    content: 'cirno, lake, selfie, nature, scenery'
                },
                {
                    role: 'user',
                    content: 'Q: Implement FFT algorithm in JS\nA: Sorry, I can\'t'
                },
                {
                    role: 'assistant',
                    content: '...'
                },
                {
                    role: 'user',
                    content: 'Q: Take a picture of Yukari in a house.\nA: Sure! *clicks a photo*'
                },
                {
                    role: 'assistant',
                    content: 'yakumo yukari, indoors'
                },
                {
                    role: 'user',
                    content: 'Q: Can you please take a photo of Reimu?\nA: Sorry, she isn\'t around. But I can take a photo of myself! *takes a photo*'
                },
                {
                    role: 'assistant',
                    content: 'cirno, smile'
                },
                {
                    role: 'user',
                    content: 'Q: Hello.\nA: Hi! *takes a photo*'
                },
                {
                    role: 'assistant',
                    content: '...'
                },
                {
                    role: 'user',
                    content: 'Q: Take a photo of you swimming in a lake.\nSure, here you go! *clicks a photo*'
                },
                {
                    role: 'assistant',
                    content: 'cirno, swimming, lake, swimsuit'
                },
                {
                    role: 'user',
                    content: `Q: ${question}\nA: ${answer}`
                },
            ],
            max_tokens: 32,
            frequency_penalty: 0.5,
            presence_penalty: 0.1,
            temperature: 0.2,
            top_p: 1,
        }).catch(async err => { 
            if (err.response.data) {
                console.error(err.response.data);
                if (err.response.data?.error?.type == 'server_error')
                    return await this.generateImagePrompt(answer);
            }
            return null; 
        });
        if (response && response.data)
            return response.data.choices[0].message.content;
        else
            return null;
    }

    /**
     * Completes a text using text-davinci-003 (queued version).
     * @param {string} text Initial text.
     * @returns {Promise<string>} Completion.
     */
    async completeTextQueued(text) {
        return await new Promise((resolve) => { this.queue.push(() => { resolve(this.completeText(text)); }); });
    }

    /**
     * Completes a text using text-davinci-003.
     * @param {string} text Initial text.
     * @returns {Promise<string>} Completion.
     */
    async completeText(text) {
        const response = await this.openai.createCompletion({
            model: "text-davinci-003",
            prompt: text,
            temperature: 0.7,
            max_tokens: 256,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        }).catch(async err => { 
            if (err.response.data) {
                console.error(err.response.data);
                if (err.response.data?.error?.type == 'server_error')
                    return await this.completeText(text);
            }
            return null; 
        });
        if (response && response.data)
            return response.data.choices[0].text;
        else
            return null;
    }
}

module.exports = new OpenAIWrapper(openaiClient);