const { Events } = require('kazagumo');
const { 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ActivityType 
} = require('discord.js');

module.exports = {
    name: Events.PlayerStart,
    async execute(client, player, track) {
        // Удаление таймера отключения, если он существует
        if (player.data.has("disconnectTimeout")) {
            clearTimeout(player.data.get("disconnectTimeout"));
            player.data.delete("disconnectTimeout");
        }

        // Иконки платформ
        const platformIcons = {
            youtube: 'https://cdn.discordapp.com/attachments/1131615683189407856/1337201276487860266/youtube.gif?ex=682087fc&is=681f367c&hm=71cfe86ec0dda0e73e2ecbe685784487aef1478e1b27aa9b2e1e732e67838980&',
            spotify: 'https://cdn.discordapp.com/attachments/1131615683189407856/1337201275519107195/spotify.gif?ex=682087fc&is=681f367c&hm=38e51b797238b5e0587d829402afa4a3317f79df70e39a95379125cfa2bb967c&',
            soundcloud: 'https://cdn.discordapp.com/attachments/1131615683189407856/1337201274759942277/soundcloud_slowed.gif?ex=682087fb&is=681f367b&hm=15942c5f9e58cd6b1d50458c8202c27c88e4b9dee97df4c226f409b6e5d5c0ad&',
            applemusic: 'https://cdn.discordapp.com/attachments/1131615683189407856/1337201278144745492/apple.gif?ex=682087fc&is=681f367c&hm=f1a333620ea9bf6a5e51e192e36fdd01b2557689292cbfeea4a293fb115131f0&',
            deezer: 'https://cdn.discordapp.com/attachments/1131615683189407856/1337201277095903322/deezer.gif?ex=682087fc&is=681f367c&hm=483412020dd766b9dd56f8be1671dc7525e08b502862b0e657574faf172c515d&',
            jiosaavn: 'https://i.imgur.com/N9Nt80h.png',
            default: 'https://thumbs2.imgbox.com/4f/9c/adRv6TPw_t.png'
        };

        // Цвета платформ
        const platformColors = {
            youtube: 0xff0000,
            spotify: 0x1DB954,
            soundcloud: 0xff3300,
            applemusic: 0xfc3c44,
            deezer: 0x5f0a87,
            jiosaavn: 0x008A78,
            default: 0xffff00
        };

        // Получение имени голосового канала
        const guild = client.guilds.cache.get(player.guildId);
        const voiceChannel = guild?.channels.cache.get(player.voiceId);
        const botVoiceChannelName = voiceChannel?.name || 'Неизвестный канал';

        // Определение платформы
        const platform = platformIcons[track.sourceName] ? track.sourceName : 'default';
        const color = platformColors[platform];
        const icon = platformIcons[platform];

        // Форматирование времени
        const formatTime = (ms) => {
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.floor((ms % 60000) / 1000);
            return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        };

        // Создание прогресс-бара
        const createProgressBar = (current, total) => {
            const barLength = 16;
            const progressIndex = Math.min(Math.floor((current / total) * barLength), barLength - 1);
            const before = '▬'.repeat(progressIndex);
            const circle = '🔘';
            const after = '▬'.repeat(barLength - progressIndex - 1);
            return `${before}${circle}${after}`;
        };

        const embedDescription = `## [${track.title}](${track.realUri})`;
        const isPlayingEmbed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: '🎸 Сейчас играю 🎸', iconURL: icon })
            .setDescription(`${embedDescription}\n\n${createProgressBar(0, track.length)}  ${formatTime(0)} / ${formatTime(track.length)}`)
            .addFields(
                { name: '🎶 Заказал', value: `<@${track.requester.id}>`, inline: true },
                { name: '🎤 Автор', value: track.author, inline: true },
                { name: '⏱️ Длительность:', value: `\`${formatTime(track.length)}\``, inline: true }
            )
            .setImage(track.thumbnail)
            .setFooter({
                text: `Навожу суету в: "${botVoiceChannelName}" 😎`,
                iconURL: "https://media.tenor.com/aaEMtGfZFbkAAAAi/rat-spinning.gif"
            })

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('stop').setLabel('⏹️').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('previous').setLabel('⏮').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('pause_resume').setLabel('⏯️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('skip').setLabel('⏭').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('shuffle').setLabel('🔀').setStyle(ButtonStyle.Secondary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('clear_queue').setLabel('🗑️').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('show_queue').setLabel('📜').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('volume_down').setLabel('🔉').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('volume_up').setLabel('🔊').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('repeat').setLabel('🔁').setStyle(ButtonStyle.Secondary)
            );

        const channel = client.channels.cache.get(player.textId);
        if (channel) {
            channel.send({ embeds: [isPlayingEmbed], components: [row1, row2] }).then((message) => {
                player.data.set("message", message);
                let currentDuration = 0;

                const interval = setInterval(async () => {
                    if (player.paused) return;

                    currentDuration += 3000;
                    if (currentDuration >= track.length) {
                        clearInterval(interval);
                        return;
                    }

                    if (!message) {
                        clearInterval(interval);
                        return;
                    }

                    const updatedEmbed = EmbedBuilder.from(isPlayingEmbed)
                        .setDescription(`${embedDescription}\n\n${createProgressBar(currentDuration, track.length)}  ${formatTime(currentDuration)} / ${formatTime(track.length)}`);
                    try{
                        await message.edit({ embeds: [updatedEmbed] });
                    } catch(error) {}
                }, 3000);

                client.user.setActivity({
                    name: `${track.author} - ${track.title}`,
                    type: ActivityType.Listening,
                });
            });
        }

        // Таймер выхода из пустого канала
        setTimeout(async () => {
            const voiceChannel = client.channels.cache.get(player.voiceId);
            if (voiceChannel?.members.size === 1) {
                const message = player.data.get("message");
                if (message) await message.delete().catch(console.error);
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setDescription('Я ушла, потому что одной играть скучно.');

                const textChannel = client.channels.cache.get(player.textId);
                if (textChannel) await textChannel.send({ embeds: [embed] });
                await player.destroy();
            }
        }, 60000);
    },
};
