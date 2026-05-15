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

        // Иконки платформ (⚠️ Discord attachment URLs истекают! Замени на cdn.discordapp.com/emojis/ID.gif)
        const platformIcons = {
            youtube:    'https://cdn.discordapp.com/attachments/1131615683189407856/1337201276487860266/youtube.gif?ex=6a07aa3c&is=6a0658bc&hm=45a627a97e4a04ac9dc62a312f2f624f963f4965d5062aff7fef87683868b75f&',
            spotify:    'https://cdn.discordapp.com/attachments/1131615683189407856/1337201275519107195/spotify.gif?ex=6a07aa3c&is=6a0658bc&hm=24b3e79f6656cd041cf2c63d469d86718a27366a5639df61a055b5889b0428c2&',
            soundcloud: 'https://cdn.discordapp.com/attachments/1131615683189407856/1337201276005650442/soundcloud.gif?ex=6a07aa3c&is=6a0658bc&hm=a2f07f06646be9eb48e76624d515260e01919f45d1895302251f9aa71bbcc7b0&',
            applemusic: 'https://cdn.discordapp.com/attachments/1131615683189407856/1337201278144745492/apple.gif?ex=6a07aa3c&is=6a0658bc&hm=c9b03f0e891fabf3e2a5befc4002a906b184832bc8eb10e9aac8a9a342ddc8db&',
            deezer:     'https://cdn.discordapp.com/attachments/1131615683189407856/1337201277095903322/deezer.gif?ex=6a07aa3c&is=6a0658bc&hm=ecdbb483744f307b812a1a7238833ca4c518d8e9956902d68d78490951771151&',
            jiosaavn:   'https://i.imgur.com/N9Nt80h.png',
            default:    'https://thumbs2.imgbox.com/4f/9c/adRv6TPw_t.png'
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
