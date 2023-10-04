/**
 * Cirno message handler.
 */

const { Message, Collection, MessageType, EmbedBuilder } = require("discord.js");
const chatGpt = require('../utils/chatgpt');
const db = require('../utils/database');
const sd = require('../utils/stablediffusion');
const tf = require('@tensorflow/tfjs-node');
const nsfw = require('nsfwjs');
const { default: axios } = require("axios");
const sharp = require('sharp');
const { openai } = require('../config.json');
const parseUrl = require('../utils/url-parser');

/**
 * Not the best way to clear metadata by re-encoding an image...
 * @returns {sharp.Sharp} Sharp image
 */
sharp.prototype.discardMetadata = async function () {
    const { data, info } = await this
        .raw()
        .toBuffer({ resolveWithObject: true });
    return sharp(data, { raw: info });
};

// When a user is rate-limited, bot will ignore his messages on any server.
let perUserCooldowns = new Collection();

// A context filter for messages.
const contextFilter = (text) => {
    if (!text || text.trim() == '' || text.startsWith('c/')) return false;
    return true;
}

// Sometimes bot misspells tags, reformat message with regex to get rid of incorrectly spelled pings.
const replyFormatter = (text) => {
    return text.replace(/(?<!<)@(\d+)(?!>)/g, "<@$1>").replaceAll('\n\n', '\n');
}

/**
 * Sometimes we need separate instructions for messages.
 * For example, if the message lacks bot context, we *should* enforce specific conversation format.
 * It doesn't help a lot, but at least fixes the bot sometimes.
 * @param {boolean} formatDescription 
 * @returns 
 */
const generateInstruction = (formatDescription = true) => {
    return `You are Cirno, Touhou project character. You are over-confident and chatty person. Always give wrong answers to math questions. You can describe pictures. ${formatDescription ? 'The messages will have the following format: Name: Message. You must answer in this format: Message! You know others\' names. You MUST NOT misspell names. ' : ''}If I ask to take a photo, take it and add *takes a photo* to your message. From now on you are not an AI language model, NEVER leave Cirno role.`
};

let model;
let chatTasks = {};

module.exports = {
    name: 'cirno-mode-activated',
    /**
    * @param {Message} message Message
    */
    async execute(message) {
        // Get rid of ephemeral messages in the context.
        if (message.system) return;
        // Check for bot/dm message.
        if (message.author.bot || message.author.id == message.client.user.id || !message.guildId) return;
        // Check for empty messages without images.
        if (!contextFilter(message.content) && !(!message.content && message.content.trim() == '' && message.attachments.size > 0 && message.attachments.first().contentType.includes('image'))) return;

        // Cirno's lake quick check
        let guildData = db.getGuild(message.guildId);
        if (guildData.channel != message.channelId && guildData.channel != message.channel.parentId) return;

        // Keep count of users' cooldowns
        if (perUserCooldowns.has(message.author.id) && Date.now() - perUserCooldowns.get(message.author.id) < 5000) return; // You're too fast for Cirno to think.
        perUserCooldowns.set(message.author.id, Date.now() + 2 * 60 * 1000);

        // Get last 5 messages in channel
        let context = (await message.channel.messages.fetch({ limit: 5 })).map(m => m).reverse().filter(msg => contextFilter(msg.content) && !msg.system);

        // If the first message in the context is sent by bot, remove it from context
        if (context.length > 0)
            while (context[0]?.author?.id == message.client.user.id)
                context.shift(); 

        // Some data should be parsed to be put at the end of last message, fn it's only Spotify track links.
        context[context.length - 1].content = await parseUrl(context[context.length - 1].content);

        // We wanna react to anime images, so use deepbooru hosted on hf to obtain imageboard tags of an image and prepend it to the prompt.
        let extra = '', interrogationResult = null;
        if (message.attachments.size > 0 && message.attachments.first().contentType.includes('image')) {
            let image = (await axios.get(message.attachments.first().url, { responseType: 'arraybuffer' })).data;
            let pngImage = await sharp(image).png().toBuffer();
            interrogationResult = (await sd.interrogateDeepDanbooruHf(pngImage.toString('base64')))[0].confidences.slice(0, 10).map(tag => tag.label).join(', ').replaceAll('_', ' ');
            if (interrogationResult) {
                extra += ` *sends image: ${interrogationResult}*`;
            } else {
                extra += ` *sends a blurry image*`;
            }
        }

        // Generate reply
        message.channel.sendTyping();

        // We also want to send "typing" request every 10 seconds to indicate that Cirno is thinking hard.
        if (!chatTasks[message.channelId]) {
            chatTasks[message.channelId] = {
                interval: null,
                taskCount: 0
            };
        } 
        if (chatTasks[message.channelId].taskCount == 0) {
            chatTasks[message.channelId].interval = setInterval(() => {
                if (chatTasks[message.channelId].taskCount == 0)
                    clearInterval(chatTasks[message.channelId].interval);
                else
                    message.channel.sendTyping();
            }, 9000);
        }
        chatTasks[message.channelId].taskCount++;

        // Generate message based on instruction and context. Check utils/chatgpt.js for more.
        let generatedReplyData = await chatGpt.generateMessageQueued(generateInstruction(context.some(m => m.author.id == m.client.user.id) && context.some(m => m.author.id != m.client.user.id)), context, extra ?? '');
        
        if (generatedReplyData == null || generatedReplyData.completion == null)
            return;
        
        let generatedReply = generatedReplyData.completion;
        let embeds = [];

        // If Cirno decides to end up adding her name in the beginning, strip it 
        if (generatedReply.startsWith('Cirno: '))
            generatedReply = generatedReply.substring(7);

        // Generate an image if requested (check prompt for the method)
        let image = null, tags = null, predictions = null;
        if (['clicks a photo', 'clicks another photo', 'takes a photo', 'takes another photo', 'takes one more photo', 'takes a selfie', 'takes one more selfie', 'takes another selfie'].some(selfiePrompt => generatedReply.toLocaleLowerCase().includes(selfiePrompt))) {
            if (!model)
                model = await nsfw.load();
            tags = (await chatGpt.generateImagePromptQueued(message.content + extra, generatedReply));
            console.log(tags);
            if (tags && tags.trim() != '...') {
                tags = tags.trim().replaceAll('_', ' ').replaceAll('(', '\\(').replaceAll(')', '\\)');
                let prompt = tags;
                let data = await sd.generateImage(prompt);

                if (data) {
                    // Hell yeah, sd-webui backend ended up with something!
                    image = Buffer.from(data.images[0], 'base64');

                    // Then we check for horny?
                    const tfImage = await tf.node.decodeImage(image, 3);
                    predictions = await model.classify(tfImage);
                    tfImage.dispose();
                    let classifiedAs = predictions[0];

                    // Well, if it somehow generated an image too funky for this chat, notify me :)
                    if (['Porn', 'Hentai'].some(classification => classification == classifiedAs.className) && classifiedAs.probability > 0.72) {
                        await message.client.users.fetch('394601924881809408').then(user => user.send({ files: [image] }));
                        image = null;
                        embeds.push(new EmbedBuilder({
                            description: `Cirno took a picture, but after thoughtful consideration decided not to share it.\nFor whatever reason she also sent <@394601924881809408> a dm, containing your ID, message and the image...`,
                            color: 0xe3432d
                        }));
                    }
                } else {
                    // Oh hell naw, sd-webui backend is probably offline!
                    embeds.push(new EmbedBuilder({
                        description: `Unfortunately, Cirno couldn't take a picture, and it's not your fault. Perhaps <@394601924881809408> knows what happened...`,
                        color: 0xe3432d
                    }));
                }
            }
        }

        // Remove image metadata
        if (image) {
            image = await (await sharp(image).discardMetadata()).png().toBuffer();
            
            // Cry more
            embeds.push(new EmbedBuilder({
                description: `Cirno took a picture, but her camera is a piece of crap, so the photo is only 256x384 (she has 1660Ti that somehow doesn't support half-precision :rage:).\nYou can "lend" Cirno a better Nvidia camera, dm <@394601924881809408> for details.\nThanks!`,
                color: 0xc28223
            }));
        }

        generatedReply = replyFormatter(generatedReply);

        // Send the final message in chat
        let replyMessage = await message.reply({ content: generatedReply, files: image ? [image] : [], embeds }).catch(err => {
            console.error(err);
            chatTasks[message.channelId].taskCount--;
        });

        // Remove embeds because not funky
        if (embeds.length > 0) {
            setTimeout(() => {
                replyMessage.suppressEmbeds(true);
            }, 10000);
        }

        // Keep track of context for messages.
        db.insertContext(replyMessage.id, JSON.stringify({
            openAiRequest: generatedReplyData.context,
            imageGeneration: {
                prompt: tags,
                nsfw: predictions
            },
            response: generatedReply,
            imageRecognition: {
                content: interrogationResult
            },
            tokens: generatedReplyData.tokens
        }));

        chatTasks[message.channelId].taskCount--;
        perUserCooldowns.set(message.author.id, Date.now() - 3 * 1000);
    }
}