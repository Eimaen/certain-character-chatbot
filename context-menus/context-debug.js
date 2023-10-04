const { ContextMenuCommandInteraction, ApplicationCommandType, EmbedBuilder } = require("discord.js");
const db = require('../utils/database');

module.exports = {
    name: 'Debug context',
    type: ApplicationCommandType.Message,

    /**
    * @param {ContextMenuCommandInteraction} interaction Application command
    */
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let context = db.getContext(interaction.targetId);

        if (!context) {
            return await interaction.editReply({ embeds: [
                new EmbedBuilder()
                    .setDescription('No record found in context database for this message.')
                    .setColor('Red')
            ] });
        }

        let data = JSON.parse(context.data);
        let report = data.openAiRequest.messages.map(msg => `**${msg.role}**: \`\`\`${msg.content}\`\`\``).join('\n');
        
        if (data.imageGeneration.prompt && data.imageGeneration.nsfw)
            report += `\n\n**Image generation prompt:** \`${data.imageGeneration.prompt}\`\n**NSFW.JS verdict:**\n${data.imageGeneration.nsfw.map(verdict => `\\- ${verdict.className}: \`${(verdict.probability * 100).toFixed(2)}%\``).join('\n')}`;

        if (data.imageRecognition.content)
            report += `\n\n**Image recognition description:** \`${data.imageRecognition.content}\``;

        if (data.tokens)
            report += `\n\n**Prompt tokens:** \`${data.tokens.prompt_tokens}\`\n**Completion tokens:** \`${data.tokens.completion_tokens}\`\n**Total tokens:** \`${data.tokens.total_tokens}\` (avg. cost: \`${(data.tokens.prompt_tokens * 0.0000015 + data.tokens.completion_tokens * 0.000002).toFixed(6)}$\`)`;

        await interaction.editReply({ embeds: [
            new EmbedBuilder()
                .setDescription(report)
                .setColor('Green')
        ] });
    }
};