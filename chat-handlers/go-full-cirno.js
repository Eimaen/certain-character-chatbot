const { Message, Collection } = require("discord.js");
const chatGpt = require('../utils/chatgpt');
const db = require('../utils/database');
const sd = require('../utils/stablediffusion');
const tf = require('@tensorflow/tfjs-node');
const nsfw = require('nsfwjs');

let perUserCooldowns = new Collection();

// A context filter for messages
const contextFilter = (text) => {
    if (!text || text.trim() == '' || text.startsWith('c/')) return false;
    if (text.length > 256) return false;
    let allow = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ,&^*/-+$#@!?<>._=()[]{}:;%~1234567890’'\"\n\t";
    return !text.split('').some(char => !allow.split('').includes(char));
}

const replyFormatter = (text) => {
    return text.replace(/(?<!<)@(\d+)(?!>)/g, "<@$1>");
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

let model;

module.exports = {
    name: 'cirno-mode-activated',
    /**
    * @param {Message} message Message
    */
    async execute(message) {
        if ((message.author.bot || message.author.id == message.client.user.id)) return;
        if (!contextFilter(message.content)) return;

        // Cirno's lake quick check
        let guildData = db.getGuild(message.guildId);
        if (guildData.channel != message.channelId) return;

        // Keep count of users' cooldowns
        if (perUserCooldowns.has(message.author.id) && Date.now() - perUserCooldowns.get(message.author.id) < 5000) return; // You're too fast for Cirno to think.
        perUserCooldowns.set(message.author.id, Date.now() + 2 * 60 * 1000);

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
            if (!model)
                model = await nsfw.load();

            let tags = (await chatGpt.completeText(`Cirno is asked to take a photo. Generate at least 8 danbooru tags based on request.\nRequest: "${message.content}"\nComma-separated danbooru tags:`))
            if (tags) {
                tags = tags.trim().replaceAll('_', ' ').replaceAll('(', '\\(').replaceAll(')', '\\)');
                let prompt = tags;
                console.log(prompt);
                let data = await sd.generateImage(prompt);

                if (!data) {
                    message.channel.send('c/ **Debug message:** *Cirno is unable to generate an image, is Stable Diffusion backend available?*');
                } else {
                    image = Buffer.from(data.images[0], 'base64');

                    const tfImage = await tf.node.decodeImage(image, 3);
                    const predictions = await model.classify(tfImage);
                    tfImage.dispose();
                    const classifiedAs = predictions[0];

                    if (['Porn', 'Hentai'].some(classification => classification == classifiedAs.className) && classifiedAs.probability > 0.9) {
                        image = undefined;
                        message.channel.send('c/ **Debug message:** *Cirno generated NSFW... If you believe it\'s a mistake, contact devs (<@394601924881809408>)*');
                    }
                }
            }
        }

        generatedReply = replyFormatter(generatedReply);

        // Send the final message in chat
        message.reply({ content: generatedReply, files: image ? [image] : [] });

        perUserCooldowns.set(message.author.id, Date.now() - 3 * 1000);
    }
}