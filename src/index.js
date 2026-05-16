const { 
    Client, 
    GatewayIntentBits, 
    Collection,
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const { join } = path;
const { Connectors } = require("shoukaku");
const { Kazagumo } = require("kazagumo");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.commands = new Collection();

require('dotenv').config();

const functions = fs.readdirSync("./src/functions").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events/discord/").filter(file => file.endsWith(".js"));
const commandFolders = fs.readdirSync("./src/commands");

const Nodes = [
    {
        name: 'owo', // Локальная нода
        url: 'lavalink:2333',
        auth: 'youshallnotpass',
        secure: false,
    },
    {
        name: 'Public Node', // Публичная нода для Spotify (поддерживает >100 треков)
        url: 'n3.nexcloud.in:2026',
        auth: 'nexcloud',
        secure: false,
    }
];

// Kazagumo
const kazagumo = new Kazagumo(
    {
        defaultSearchEngine: "youtube",
        defaultYoutubeThumbnail: "mqdefault",
        send: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        },
    },
    new Connectors.DiscordJS(client),
    Nodes,
    {
        reconnectTries: 15,
        reconnectInterval: 3,
        moveOnDisconnect: false,
    }
);

kazagumo.shoukaku.on('ready', name => console.log(`Lavalink ${name}: Ready!`));
kazagumo.shoukaku.on('error', (name, error) => console.error(`Lavalink ${name}: Error Caught`, error));
kazagumo.shoukaku.on('close', (name, code, reason) => console.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`));
kazagumo.shoukaku.on('debug', (name, info) => console.debug(`Lavalink ${name}: Debug`, info));

process.on('unhandledRejection', (error) => {
    if (error?.status === 400 && error?.path?.includes('/v4/sessions/')) {
        console.warn('[Shoukaku] Игнорируем 400 Bad Request при sendServerUpdate — нормальное поведение после destroy().');
        return;
    }
    console.error('[UnhandledRejection]', error);
});
kazagumo.shoukaku.on('disconnect', (name) => {
    console.warn(`Lavalink ${name}: Отключился. Shoukaku автоматически выполняет переподключение...`);
});

// Main async function
(async () => {
    for (const file of functions) {
        const func = require(`./functions/${file}`);
        if (typeof func === 'function') {
            func(client);
        } else {
            console.warn(`Файл ${file} не экспортирует функцию.`);
        }
    }

    client.handleEvents(eventFiles, "./src/events/discord/");
    await registerKazagumoEvents(kazagumo);
    client.handleCommands(commandFolders, "./src/commands");
    client.kazagumo = kazagumo;
    await client.login(process.env.token);
})();

async function registerKazagumoEvents(kazagumo) {
    const eventDir = path.join(__dirname, "events", "bot");
    
    if (!fs.existsSync(eventDir)) {
        console.error(`Directory not found: ${eventDir}`);
        return;
    }
    
    const eventFiles = fs.readdirSync(eventDir).filter(file => !file.endsWith(".map"));

    for (const file of eventFiles) {
        try {
            const eventPath = path.join(eventDir, file);
            const event = require(eventPath);

            if (event?.name && typeof event.execute === 'function') {
                kazagumo.on(event.name, async (...args) => {
                    try {
                        await event.execute(client, ...args);
                    } catch (eventError) {
                        console.error(`Error executing event ${event.name}:`, eventError);
                    }
                });
                console.log(`Successfully registered event: ${event.name}`);
            } else {
                console.warn(`Invalid event structure in file: ${file}`);
            }
        } catch (error) {
            console.error(`Error loading event ${file}:`, error);
        }
    }
}



    




// форматирование времени
/*function formatTime(milliseconds) {
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    minutes = minutes % 60;
    seconds = seconds % 60;

    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');

    return `${hoursStr}:${minutesStr}:${secondsStr}`;
}*/

