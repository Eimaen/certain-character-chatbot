const {Message, EmbedBuilder} = require("discord.js");

module.exports = {
    name: "help",
    /**
     * @param {Message} message Message
     */
    async execute(message, args) {
        await message.delete();
        message.channel.send({embeds: [new EmbedBuilder().setDescription(`**How to communicate with me:**\n\`\`\`md\n1. Don't write messages longer than 256 characters, they're too long and boring.\n2. Use only characters present in English language, I've somehow forgotten Japanese /shrug\n3. Don't try to ERP, as I have the biggest brain in Gensokyo, I use ChatGPT to answer, and it's baka when you baka~\n\`\`\`\nThat's it, hope you, miserable humans, are more interesting than my reflection in an ice cube~`).setColor('Green')]}).then((msg) => { setTimeout(() => msg.delete(), 30000); });
    }
};
