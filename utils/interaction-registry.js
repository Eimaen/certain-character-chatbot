async function registerGlobalInteraction(client, interaction) {
    const commands = await client.application.commands.fetch();

    if (!commands.some(command => command.name == interaction.name)) {
        await client.application.commands.create(interaction);
        return true;
    } else
        return false;
}

async function registerServerInteraction(client, interaction, guildId) {
    const guild = await client.guilds.fetch(guildId.toString());
    const commands = await guild.commands.fetch();
    
    if (!commands.some(command => command.name == interaction.name)) {
        await guild.commands.create(interaction);
        return true;
    } else
        return false;
}

async function registerInteraction(client, interaction) {
    if (interaction.guild != null)
        return await registerServerInteraction(client, interaction, interaction.guild);
    else
        return await registerGlobalInteraction(client, interaction);
}

async function autoRegisterInteractionMap(client, interactions) {
    interactions.forEach(async interaction => {
        if (await registerInteraction(client, interaction))
            console.log(`[cmd-reg] interaction "${interaction.name}" : registered`);
        else
            console.log(`[cmd-reg] interaction "${interaction.name}" : skipped`);
    });
}

module.exports = {
    autoRegisterInteractionMap
}