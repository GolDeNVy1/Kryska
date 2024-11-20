const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    Collection, 
    ActivityType,
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const fs = require('fs');
const { Connectors } = require("shoukaku");
const { Kazagumo } = require("kazagumo");

const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
] });

// Лавалинк
client.commands = new Collection();

require('dotenv').config();

const functions = fs.readdirSync("./src/functions").filter(file => file.endsWith(".js"));
const eventFiles = fs.readdirSync("./src/events").filter(file => file.endsWith(".js"));
const commandFolders = fs.readdirSync("./src/commands");

const Nodes = [
    {
        name: 'owo',
        url: 'lavalink:2333',
        auth: 'youshallnotpass',
        secure: false,
    }
];

// Kazagumo
const kazagumo = new Kazagumo(
    {
        defaultSearchEngine: "soundcloud",
        defaultYoutubeThumbnail: "mqdefault",
        send: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        }
    }, new Connectors.DiscordJS(client), Nodes);
    
kazagumo.shoukaku.on('ready', (name) => console.log(`Lavalink ${name}: Ready!`));
kazagumo.shoukaku.on('error', (name, error) => console.error(`Lavalink ${name}: Error Caught`, error));
kazagumo.shoukaku.on('close', (name, code, reason) => console.warn(`Lavalink ${name}: Closed, Code ${code}, Reason ${reason || 'No reason'}`));
kazagumo.shoukaku.on('debug', (name, info) => console.debug(`Lavalink ${name}: Debug`, info));
kazagumo.shoukaku.on('disconnect', (name, count) => {
    const players = [...kazagumo.shoukaku.players.values()].filter(p => p.node.name === name);
    players.map(player => {
        kazagumo.destroyPlayer(player.guildId);
        player.destroy();
    });
    console.warn(`Lavalink ${name}: Disconnected`);
});


// кнопочки
kazagumo.on('playerStart', (player, track) => {
    let embedColor = 0xffff00; // цвет по умолчанию
    let embedTitle = `🎸Сейчас играю🎸`;
    let embedDescription = `[${track.title}](${track.realUri})`;
    if (track.uri.includes('youtube.com') || track.uri.includes('youtu.be')) {
        embedColor = 0xff0000; // красный цвет для YouTube
        embedTitle = `📺 YouTube - 🎸Сейчас играю🎸`;
    } else if (track.uri.includes('spotify.com')) {
        embedColor = 0x1db954; // зелёный цвет для Spotify
        embedTitle = `🎧 Spotify - 🎸Сейчас играю🎸`;
    } else if (track.uri.includes('soundcloud.com')) {
        embedColor = 0xff7700; // оранжевый цвет для SoundCloud
        embedTitle = `☁️ SoundCloud - 🎸Сейчас играю🎸`;
    } else if (track.uri.includes('apple.com')) {
        embedColor = 0xff69b4; // розовый для эпл
        embedTitle = `🎶 Apple Music - 🎸Сейчас играю🎸`;
    }
    
    
    const isPlayingEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(embedTitle)
        .setDescription(embedDescription)
        .addFields(
            { name: '🎶Заказал', value: `<@${track.requester.id}>`, inline: true },
            { name: '🎤 Автор песни', value: `${track.author}`, inline: true })
        .setImage(track.thumbnail)
        .setFooter({ 
            text: `Длительность ${formatTime(track.length)}`, 
            iconURL: "https://media.tenor.com/aaEMtGfZFbkAAAAi/rat-spinning.gif" 
        });


    const channel = client.channels.cache.get(player.textChannel);
    if (channel) channel.send({ embeds: [isPlayingEmbed] });



    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('stop')
                .setLabel('⏹️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('⏮')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('pause_resume')
                .setLabel('⏯️')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('skip')
                .setLabel('⏭')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('shuffle')
                .setLabel('🔀')
                .setStyle(ButtonStyle.Secondary),
        );

   /* const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('volume_down')
                .setLabel('🔉')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('volume_up')
                .setLabel('🔊')
                .setStyle(ButtonStyle.Secondary)
        ); */


        
client.channels.cache.get(player.textId)?.send({
    embeds: [isPlayingEmbed],
    components: [row1/*, row2*/]
}).then(message => {
    player.data.set("message", message);
    
    

    // статус бота
    client.user.setActivity({
        name: `${track.author} - ${track.title}`,
        type: ActivityType.Listening,
    });
});
});




kazagumo.on('playerStart', (player) => {
        setTimeout(async () => {
            if (!player) return;

            const voiceChannel = client.channels.cache.get(player.voiceId);
            if (voiceChannel && voiceChannel.members && voiceChannel.members.size === 1) {
                await player.destroy();
                await pickPresence();
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setDescription('Я ушла, потому что одной играть скучно.');

                const textChannel = client.channels.cache.get(player.textId);
                if (textChannel) await textChannel.send({ embeds: [embed] });
            }
        }, 60000);
        
        });

let disconnectTimeout;

kazagumo.on('playerEmpty', async (player) => {
    if (!player.queue.length) {
        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setDescription('Репертуар закончился, если хочешь закажи ещё песенку).');

        const channel = client.channels.cache.get(player.textId);
        if (channel) await channel.send({ embeds: [embed] });

        if (disconnectTimeout) clearTimeout(disconnectTimeout);

        disconnectTimeout = setTimeout(async () => {

            if (!player.queue.length) {  
                await player.destroy();

                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setDescription('Я пойду, у меня ещё много дел, позовёте когда будет скучно без музыки ;)');

                const textChannel = client.channels.cache.get(player.textId);
                if (textChannel) await textChannel.send({ embeds: [embed] });
            } 
        }, 60000);
    }
    await pickPresence();
});


kazagumo.on('playerEnd', async (player, track) => {
    const lastMessage = player.data.get("message");
    if (lastMessage) {
        try {
            const fetchedMessage = await lastMessage.channel.messages.fetch(lastMessage.id).catch(() => null);
            if (!fetchedMessage) {
                console.warn(`Сообщение уже удалено или недоступно: ${lastMessage.id}`);
                player.data.delete("message");
                return;
            }

            await fetchedMessage.delete();
        } catch (error) {
            if (error.code === 10008) {
                console.warn(`Сообщение с ID ${lastMessage.id} уже удалено.`);
            } else {
                console.error('Ошибка при удалении сообщения "Now Playing":', error);
            }
        }

        player.data.delete("message");
    }
});

kazagumo.on('playerStart', async (player, track) => {
    if (disconnectTimeout) {
        clearTimeout(disconnectTimeout); 
        disconnectTimeout = null;
    }
});
        
        
        

kazagumo.on('playerError', (player, error) => {
    console.log(`Player error in guild ${player.guildId}, error: ${error}`);
});

kazagumo.on('playerResolveError', (player, track, error) => {
    console.log(`Resolve error for track ${track.title} in guild ${player.guildId}, error: ${error}`);
});

async function pickPresence () {
    try {
        await client.user.setPresence({
            activities: [
                {
                    name: "Ем сыр 🧀",
                    type: ActivityType.Custom,
                },
            ],
            status: 'idle',
        })
    } catch (error) {
        console.error(error);
    }
}

// форматирование времени
function formatTime(milliseconds) {
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    minutes = minutes % 60;
    seconds = seconds % 60;

    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');

    return `${hoursStr}:${minutesStr}:${secondsStr}`;
}

(async () => {
    for (const file of functions) {
        require(`./functions/${file}`)(client);
    }
    client.handleEvents(eventFiles, "./src/events");
    client.handleCommands(commandFolders, "./src/commands");
    client.kazagumo = kazagumo;
    await client.login(process.env.token);
})();
