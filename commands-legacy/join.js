const { Message, EmbedBuilder } = require("discord.js");
const GuildVoiceSubscription = require("../utils/voice-subscription");
const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
    name: "join",
    /**
     * @param {Message} message Message
     */
    async execute(message, args) {
        return;
        
        const voiceChannel = message.member.voice.channel;

        if (!voiceChannel)
            return;

        if (!message.guild.voiceSubscription) {
            message.guild.voiceSubscription = new GuildVoiceSubscription(
                joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: voiceChannel.guild.id,
                    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    debug: true
                }),
                voiceChannel
            );
            message.guild.voiceSubscription.voiceConnection.on('error', console.warn);
        }
    }
};
