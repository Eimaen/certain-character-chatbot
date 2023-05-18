const { Client, Events, GatewayIntentBits, ActivityType, Collection, Partials } = require('discord.js');
const { token, prefix } = require('./config.json');
const { readdirSync } = require("fs");
const { join } = require("path");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[]\]/g, "\$&");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildWebhooks, GatewayIntentBits.DirectMessages, GatewayIntentBits.DirectMessageTyping, GatewayIntentBits.DirectMessageReactions], partials: [Partials.Channel] });

client.commands = new Collection();
client.chatHandlers = new Collection();

const commandFiles = readdirSync(join(__dirname, 'commands')).filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
    const command = require(join(__dirname, 'commands', `${file}`));
    client.commands.set(command.name, command);
}

const chatHandlerFiles = readdirSync(join(__dirname, 'chat-handlers')).filter((file) => file.endsWith(".js"));
for (const file of chatHandlerFiles) {
    const handler = require(join(__dirname, 'chat-handlers', `${file}`));
    client.chatHandlers.set(handler.name, handler);
}

client.once(Events.ClientReady, async c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    client.user.setActivity({ name: "Obsolete", type: ActivityType.Watching });
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
        client.commands.get(commandName) ||
        client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    command.execute(message, args).catch((error) => {
        console.error(error);
    });
});

client.login(token);