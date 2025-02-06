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
            youtube: 'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExb2JkbXN0czltNzJ6cTY0ZThweG41d3YzZjYya28wdGlzanhqdXNwbyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/ROvaExEAr1ZcUkzjM5/giphy.gif',
            spotify: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExODB6amdtNWJhcTA3b3NmNDlzZGI2M3Q1eDZmdHFyY2xsNGNkdTNrMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/SOorx5SrvMZbz2IdXZ/giphy.gif',
            soundcloud: 'https://cdn.discordapp.com/attachments/1131615683189407856/1337201276005650442/soundcloud.gif?ex=67a6953c&is=67a543bc&hm=eb85b5baf1fa16b5aeb898fbed41ae35864775ec6924dfecf9dfdf90449eebd8&',
            applemusic: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOGxubDg0Y3NzZjBwdmNxN3JhMGplYnEyeHE5OTQ0MnZkNHBsYmM2eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uNgsDhnMZVePcoPOXE/giphy.gif',
            deezer: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExaWk4NDB4eTBxYTF5enh6bG1qZml3ZW1mdmkzZm9xNjdwMW5panpnMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/ktkyNAvYlMBU9UBYaQ/giphy.gif',
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
