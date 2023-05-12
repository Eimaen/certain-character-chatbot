const { Message, Collection } = require("discord.js");
const chatGpt = require('../utils/chatgpt');
const db = require('../utils/database');
const sd = require('../utils/stablediffusion');

let perUserCooldowns = new Collection();

// A context filter for messages
const contextFilter = (text) => {
    if (!text || text.trim() == '' || text.startsWith('c/')) return false;
    if (text.length > 256) return false;
    let allow = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ,&^*/-+$#@!?<>._=()[]{}:;%~1234567890’'\"\n\t";
    return !text.split('').some(char => !allow.split('').includes(char));
}

module.exports = {
    name: 'cirno-mode-activated',
    /**
    * @param {Message} message Message
    */
    async execute(message) {
        if (message.author.bot || message.author.id == message.client.user.id) return;
        if (!contextFilter(message.content)) return;

        // Cirno's lake quick check
        let guildData = db.getGuild(message.guildId);
        if (guildData.channel != message.channelId) return;

        // Keep count of users' cooldowns
        if (perUserCooldowns.has(message.author.id) && Date.now() - perUserCooldowns.get(message.author.id) < 5000) return; // You're too fast for Cirno to think.
        perUserCooldowns.set(message.author.id, Date.now());

        // Get last 5 messages in channel
        let context = (await message.channel.messages.fetch({ limit: 5 })).map(m => m).reverse().filter(msg => contextFilter(msg.content));

        // If the first message in the context is sent by bot, remove it from context
        if (context.length > 0)
            while (context[context.length - 1].author.id == message.client.user.id)
                context.pop();

        // Generate reply, regenerating if it has AI or "language model" in its body
        let generatedReply, retries = 0;
        message.channel.sendTyping();
        do {
            generatedReply = await chatGpt.generateMessage(context);
            retries++;
        } while (retries < 5 && generatedReply && ['AI', 'language model'].some(banPrompt => generatedReply.includes(banPrompt)))

        // If the reply wasn't generated somehow,
        if (!generatedReply)
            return message.channel.send('c/ **Debug message:** *Cirno is unable to generate an answer to this message. Is OpenAI down?*');

        // If Cirno decides to end up adding her name in the beginning, strip it 
        if (generatedReply.startsWith('Cirno: '))
            generatedReply = generatedReply.substring(7);

        // Generate an image if requested (check prompt for more info)
        let image = undefined;
        if (['clicks a photo', 'clicks another photo', 'takes a photo', 'takes another photo', 'takes one more photo', 'takes a selfie', 'takes one more selfie', 'takes another selfie'].some(selfiePrompt => generatedReply.toLocaleLowerCase().includes(selfiePrompt))) {
            let data = await sd.generateImage();
            if (!data)
                message.channel.send('c/ **Debug message:** *Cirno is unable to generate an image, is Stable Diffusion backend available?*');
            else
                image = Buffer.from(data.images[0], 'base64');
        }

        // Send the final message in chat
        message.channel.send({ content: generatedReply, files: image ? [image] : [] });
    }
}