const { CommandInteraction, EmbedBuilder } = require("discord.js");
const db = require('../utils/database');

const embedNoAdminPermission = new EmbedBuilder()
    .setDescription('You must be an admin to use this command.')
    .setColor('Red');

const embedSuccess = new EmbedBuilder()
    .setDescription(`Cirno will now respond in this channel and all its children (threads).`)
    .setColor('Green');

module.exports = {
    name: 'set-channel',
    description: 'Set the channel for Cirno to respond in',
    options: [],
    dm: false,

    /**
    * @param {CommandInteraction} interaction Application command
    */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.member.permissions.has('Administrator'))
            return interaction.editReply({ embeds: [embedNoAdminPermission] });
        
        let guildData = db.getGuild(interaction.guildId);
        guildData.channel = interaction.channelId;

        await interaction.editReply({ embeds: [embedSuccess] });

        return setTimeout(() => db.setGuild(interaction.guildId, guildData), 1000);
    }
};