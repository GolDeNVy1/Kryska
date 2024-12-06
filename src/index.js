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
kazagumo.shoukaku.on('disconnect', (name) => {
    console.warn(`Lavalink ${name}: Disconnected. Attempting to reconnect...`);
    // оно по идее не работает но это для перезапуска в случае неудачного подключения к лаве
    const node = kazagumo.shoukaku.nodes.get(name);

    if (!node) {
        console.error(`Node ${name} not found in kazagumo.shoukaku.nodes. Reinitializing node...`);
        kazagumo.shoukaku.addNode({
            name: name,
            url: 'lavalink:2333',
            auth: 'youshallnotpass',
        });
    }

    const reconnect = () => {
        const node = kazagumo.shoukaku.nodes.get(name);

        if (!node) {
            console.error(`Node ${name} still not found. Retrying in 3 seconds...`);
            setTimeout(reconnect, 3000);
            return;
        }

        if (node.connected) {
            console.log(`Node ${name} successfully reconnected.`);
            return;
        }

        console.log(`Reconnecting to node ${name}...`);
        node.connect()
            .then(() => console.log(`Node ${name} reconnected successfully!`))
            .catch((error) => {
                console.error(`Failed to reconnect to node ${name}:`, error);
                setTimeout(reconnect, 3000);
            });
    };

    reconnect();
});
// дальше всё работают


// кнопочки
kazagumo.on('playerStart', (player, track) => {
   /* let embedColor = 0xffff00; // цвет по умолчанию
    let embedTitle = `🎸Сейчас играю🎸`;
    let embedDescription = `## [${track.title}](${track.realUri})`;
    /*if (track.uri.includes('youtube.com') || track.uri.includes('youtu.be')) {
        embedColor = 0xff0000; // красный цвет для YouTube
        embedTitle = `https://pin.it/4bB6HxG8q YouTube - 🎸Сейчас играю🎸`;
    } else if (track.uri.includes('spotify.com')) {
        embedColor = 0x1db954; // зелёный цвет для Spotify
        embedTitle = `https://media4.giphy.com/media/cOfwtFobGCLJBU3DNn/giphy.gif Spotify - 🎸Сейчас играю🎸`;
    } else if (track.uri.includes('soundcloud.com')) {
        embedColor = 0xff3300; // оранжевый цвет для SoundCloud
        embedTitle = `http://surl.li/nkxqnp SoundCloud - 🎸Сейчас играю🎸`;
    } else if (track.uri.includes('apple.com')) {
        embedColor = 0xfc3c44; // розовый для эпл
        embedTitle = `http://surl.li/nylztq Apple Music - 🎸Сейчас играю🎸`;
    }
   if(platformIcons) {
        embedTitle = `🎸Сейчас играю🎸`;}*/

    const platformIcons = {
        youtube: 'https://i.imgur.com/ICj7Eip.gif',
        spotify: 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGtwaXk4YjV5eTRkcHY2MmxhaWxxYWl6cmQwbnhmNHlueGxhOWJndCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/EFGXDUBXcUd131C0CR/giphy.gif',
        soundcloud: 'https://media4.giphy.com/media/kKJPSx14GFUyAJ8VoH/giphy.gif?cid=6c09b9528qnptbim13jbqmhnqjnys6fykuvk9zhhdphzfx26&ep=v1_internal_gif_by_id&rid=giphy.gif&ct=s',
        applemusic: 'https://i.imgur.com/iK3cwrZ.gif',
        deezer: 'https://i.imgur.com/q7UeOdK.gif',
        jiosaavn: 'https://i.imgur.com/N9Nt80h.png',
        default: 'https://thumbs2.imgbox.com/4f/9c/adRv6TPw_t.png'
    }

    /*const platformIcons = {
        youtube: '<a:YouTube:1309203432044757073>',
        spotify: '<a:spotify1:1309332922544689153>',
        soundcloud: '<a:soundcloud:1309175196250407002>',
        applemusic: '<a:AppleMusic:1309330784674385973>',
        deezer: '<a:outputonlinegiftools:1309339089215946782>',
        jiosaavn: 'https://i.imgur.com/N9Nt80h.png',
        default: '<a:spinningratstupidrat:1283351974808518687>'
    }*/

    const platformColors = {
        youtube: 0xff0000,
        spotify: 0x1DB954,
        soundcloud: 0xff3300,
        applemusic: 0xfc3c44,
        deezer:0x5f0a87,
        jiosaavn:0x008A78,
        default: 0xffff00,
    }
    
    const botVoiceChannelId = player.voiceId;
    let botVoiceChannelName = 'Неизвестный канал';


    const guild = client.guilds.cache.get(player.guildId);
        if (guild) {
    const voiceChannel = guild.channels.cache.get(botVoiceChannelId);
        if (voiceChannel) botVoiceChannelName = voiceChannel.name;
}

    const platform = platformIcons.hasOwnProperty(track.sourceName) ? track.sourceName : 'default';
    const color = platformColors[platform] || platformColors.default;
    const icon = platformIcons[platform];
    
    const totalDuration = track.length;
    let currentDuration = 0;


    const formatTime = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const createProgressBar = (current, total) => {
    const barLength = 30;
    let progressIndex = Math.floor((current / total) * barLength);
    if (progressIndex >= barLength) progressIndex = barLength - 1;
    const before = '▬'.repeat(progressIndex);
    const circle = '🔘';
    const after = '▬'.repeat(barLength - progressIndex - 1);

    return `\`${before}${circle}${after}\``;
    };

    const embedDescription = `## [${track.title}](${track.realUri})`;

    const isPlayingEmbed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: '🎸Сейчас играю🎸', iconURL: icon })
        .setDescription(embedDescription)
        .addFields(
            { name: '🎶Заказал', value: `<@${track.requester.id}>`, inline: true },
            { name: '🎤 Автор', value: `${track.author}`, inline: true },
            { name: '⏱️ Длительность:', value: `\`${formatTime(track.length)}\``, inline: true })
        .setImage(track.thumbnail)
        .setFooter({ 
            text: `Навожу суету в: "${botVoiceChannelName}" 😎`, 
            iconURL: "https://media.tenor.com/aaEMtGfZFbkAAAAi/rat-spinning.gif" 
        })
        .setDescription(`${createProgressBar(currentDuration, totalDuration)}  ${formatTime(currentDuration)} / ${formatTime(totalDuration)}`);



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

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('clear_queue')
                .setLabel('🗑️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('show_queue')
                .setLabel('📜')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('volume_down')
                .setLabel('🔉')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('volume_up')
                .setLabel('🔊')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('repeat')
                .setLabel('🔁')
                .setStyle(ButtonStyle.Secondary),        
        ); 


        
    client.channels.cache.get(player.textId)?.send({
        embeds: [isPlayingEmbed],
        components: [row1, row2]
    }).then(message => {
        player.data.set("message", message);

        let currentDuration = 0;
        const totalDuration = track.length;
        let messageDeleted = false;

        const interval = setInterval(async () => {
            try {
                if (player.paused) {
                    return;
                }

                currentDuration += 1000;

                if (currentDuration >= totalDuration || messageDeleted) {
                    clearInterval(interval);
                    return;
                }
                const fetchedMessage = await message.channel.messages.fetch(message.id).catch(() => null);
                if (!fetchedMessage) {
                    messageDeleted = true;
                    clearInterval(interval);
                    return;
                }

                
                const updatedEmbed = EmbedBuilder.from(isPlayingEmbed)
                    .setDescription(`${embedDescription}\n\n${createProgressBar(currentDuration, totalDuration)}  ${formatTime(currentDuration)} / ${formatTime(totalDuration)}`);
                await message.edit({ embeds: [updatedEmbed] });
            } catch (error) {
                if (error.code === 10008) {
                    messageDeleted = true;
                    clearInterval(interval);
                } else {
                    console.error("Ошибка при обновлении сообщения:", error);
                }
            }
        }, 1000);
            
        
    // статус бота
    client.user.setActivity({
        name: `${track.author} - ${track.title}`,
        type: ActivityType.Listening,
    });
});
});



kazagumo.on('playerEnd' || 'playerEmpty', async (player, track) => {
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
    const lastMessage = player.data.get("message");
    if (lastMessage) {
        try {
            const fetchedMessage = await lastMessage.channel.messages.fetch(lastMessage.id).catch(() => null);
            if (fetchedMessage) {
                await fetchedMessage.delete();
            }
        } catch (error) {
            console.error('Ошибка при удалении сообщения:', error);
        }
        player.data.delete("message");
    }

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

(async () => {
    for (const file of functions) {
        require(`./functions/${file}`)(client);
    }
    client.handleEvents(eventFiles, "./src/events");
    client.handleCommands(commandFolders, "./src/commands");
    client.kazagumo = kazagumo;
    await client.login(process.env.token);
})();
