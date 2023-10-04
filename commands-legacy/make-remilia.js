const { Message, EmbedBuilder } = require("discord.js");
const sd = require('../utils/stablediffusion');

module.exports = {
    name: "make-remilia",
    /**
     * @param {Message} message Message
     */
    async execute(message, args) {
        let startDate = Date.now();
        let remilia = await sd.generateImage('remilia scarlet, cute, red dress, wings');
        await message.delete();
        if (remilia) {
            let image = Buffer.from(remilia.images[0], 'base64');
            message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`"make-remilia" succeeded (${Date.now() - startDate}ms).`)
                        .setColor('Red')
                ], files: [
                    image
                ]
            }).then((msg) => { setTimeout(() => msg.delete(), 30000); });
        } else {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setDescription(`Unable to "make-remilia", SD backend didn't respond.`)
                        .setColor('Red')
                ]
            }).then((msg) => { setTimeout(() => msg.delete(), 10000); });
        }
    }
};
