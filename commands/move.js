const {Message, EmbedBuilder} = require("discord.js");
const db = require('../utils/database');

module.exports = {
    name: "move",
    aliases: [
        'lake'
    ],
    /**
     * @param {Message} message Message
     */
    async execute(message, args) {
        await message.delete();
        if (!message.member.permissions.has('Administrator'))
            return message.channel.send({embeds: [new EmbedBuilder().setDescription('You should beat Touhou 9 or just be an admin to move Cirno to channels.').setColor('Red')]}).then((msg) => { setTimeout(() => msg.delete(), 5000); });
        let guildData = db.getGuild(message.guildId);
        guildData.channel = message.channelId;
        message.channel.send({embeds: [new EmbedBuilder().setDescription(`Misty Lake was somehow moved to ${message.channel.toString()}.`).setColor('Green')]}).then((msg) => { setTimeout(() => msg.delete(), 5000); });
        return setTimeout(() => db.setGuild(message.guildId, guildData), 1000);
    }
};
