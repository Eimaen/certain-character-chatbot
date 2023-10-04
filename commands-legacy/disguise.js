const {Message, EmbedBuilder} = require("discord.js");
const db = require('../utils/database');

const check = (text) => {
    let allow = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ,&^*/-+$#@!?<>._=()[]{}:;%~1234567890’'\"\n\t";
    return !text.split('').some(char => !allow.split('').includes(char));
}

module.exports = {
    name: "disguise",
    /**
     * @param {Message} message Message
     */
    async execute(message, args) {
        let disguise = message.content.substring(11);
        if (!disguise || disguise == '')
            disguise = message.author.toString();
        await message.delete();
        if (disguise.length > 32)
            return message.channel.send({embeds: [new EmbedBuilder().setDescription(`Your disguise name is too long. It shouldn't be longer than 32 characters.`).setColor('Red')]}).then((msg) => { setTimeout(() => msg.delete(), 10000); });
        if (!check(disguise))
            return message.channel.send({embeds: [new EmbedBuilder().setDescription(`Your disguise name contains illegal characters. Please, use only ASCII characters (not all tho).`).setColor('Red')]}).then((msg) => { setTimeout(() => msg.delete(), 10000); });
        db.setUser(message.author.id, { name: disguise });
        message.channel.send({embeds: [new EmbedBuilder().setDescription(`Cirno now sees your name as **${disguise}**.`).setColor('Green')]}).then((msg) => { setTimeout(() => msg.delete(), 10000); });
    }
};
