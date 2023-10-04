const { Client, Events, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { token, prefix } = require('./config.json');
const { readdirSync } = require("fs");
const { join } = require("path");
const { autoRegisterInteractionMap } = require('./utils/interaction-registry');

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[]\]/g, "\$&");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildWebhooks, GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageTyping, GatewayIntentBits.DirectMessageReactions, GatewayIntentBits.GuildVoiceStates], partials: [Partials.Channel] });

client.commands = new Collection();
client.commandsLegacy = new Collection();
client.chatHandlers = new Collection();
client.contextMenus = new Collection();

const commandFiles = readdirSync(join(__dirname, 'commands')).filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(join(__dirname, 'commands', `${file}`));
    client.commands.set(command.name, command);
}

const legacyCommandFiles = readdirSync(join(__dirname, 'commands-legacy')).filter((file) => file.endsWith(".js"));
for (const file of legacyCommandFiles) {
    const command = require(join(__dirname, 'commands-legacy', `${file}`));
    client.commandsLegacy.set(command.name, command);
}

const chatHandlerFiles = readdirSync(join(__dirname, 'chat-handlers')).filter((file) => file.endsWith(".js"));
for (const file of chatHandlerFiles) {
    const handler = require(join(__dirname, 'chat-handlers', `${file}`));
    client.chatHandlers.set(handler.name, handler);
}

const contextMenuFiles = readdirSync(join(__dirname, 'context-menus')).filter((file) => file.endsWith(".js"));
for (const file of contextMenuFiles) {
    const contextMenu = require(join(__dirname, 'context-menus', `${file}`));
    client.contextMenus.set(contextMenu.name, contextMenu);
}

client.once(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    autoRegisterInteractionMap(client, [
        ...client.commands.values(),
        ...client.contextMenus.values()
    ]).then(() => console.log('[main] async interaction registration started'));
});

client.on(Events.MessageCreate, message => {
    client.chatHandlers.forEach(handler => handler.execute(message));

    if (message.author.bot && message.author.id != client.user.id) return;
    if (!message.guild) return;

    const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(prefix)})\\s*`);
    if (!prefixRegex.test(message.content)) return;

    const [, matchedPrefix] = message.content.match(prefixRegex);

    const args = require('minimist')(message.content.slice(matchedPrefix.length).trim().split(' '));
    const commandName = args._.shift().toString().toLowerCase();

    const command =
        client.commandsLegacy.get(commandName) ||
        client.commandsLegacy.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    command.execute(message, args).catch((error) => {
        console.error(error);
    });
});


client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isContextMenuCommand()) {
        var menu = client.contextMenus.get(interaction.commandName);

        if (!menu) return;

        menu.execute(interaction).catch((error) => {
            console.error(error);
        });
    }

    if (interaction.isCommand()) {
        var command = client.commands.get(interaction.commandName);

        if (!command) return;

        if (!command.dm && (interaction.channel == null || interaction.channel.guild == null)) {
            const dmErrEmbed = new EmbedBuilder()
                .setTitle('Error')
                .setDescription('This command isn\'t supposed to be called in DM channel. You should do it on the server.')
                .setColor(0xff0000);
            return interaction.reply({ embeds: [dmErrEmbed] });
        }

        command.execute(interaction).catch((error) => {
            console.error(error);
        });
    }
});

client.login(token);