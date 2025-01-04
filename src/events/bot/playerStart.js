const { Events } = require('kazagumo');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ActivityType } = require('discord.js');

module.exports = {
    name: Events.PlayerStart,
    async execute(client, player, track,) {

        if (player.data.has("disconnectTimeout")) {
            clearTimeout(player.data.get("disconnectTimeout"));
            player.data.delete("disconnectTimeout");
        }
        
        const platformIcons = {
            youtube: 'https://i.imgur.com/AqKIfic.gif',
            spotify: 'https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGtwaXk4YjV5eTRkcHY2MmxhaWxxYWl6cmQwbnhmNHlueGxhOWJndCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/EFGXDUBXcUd131C0CR/giphy.gif',
            soundcloud: 'https://media4.giphy.com/media/kKJPSx14GFUyAJ8VoH/giphy.gif?cid=6c09b9528qnptbim13jbqmhnqjnys6fykuvk9zhhdphzfx26&ep=v1_internal_gif_by_id&rid=giphy.gif&ct=s',
            applemusic: 'https://i.imgur.com/3Lm3s9i.gif',
            deezer: 'https://i.imgur.com/q7UeOdK.gif',
            jiosaavn: 'https://i.imgur.com/N9Nt80h.png',
            default: 'https://thumbs2.imgbox.com/4f/9c/adRv6TPw_t.png'
        }

        const platformColors = {
            youtube: 0xff0000,
            spotify: 0x1DB954,
            soundcloud: 0xff3300,
            applemusic: 0xfc3c44,
            deezer: 0x5f0a87,
            jiosaavn: 0x008A78,
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
            const barLength = 16;
            let progressIndex = Math.floor((current / total) * barLength);
            if (progressIndex >= barLength) progressIndex = barLength - 1;
            const before = '▬'.repeat(progressIndex);
            const circle = '🔘';
            const after = '▬'.repeat(barLength - progressIndex - 1);

            return `${before}${circle}${after}`;
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

                    currentDuration += 3000;

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
            }, 3000);

            client.user.setActivity({
                name: `${track.author} - ${track.title}`,
                type: ActivityType.Listening,
            });
        });

        // Действия по завершению, если игрок покидает канал
        setTimeout(async () => {
            if (!player) return;
        
            const voiceChannel = client.channels.cache.get(player.voiceId);
            if (voiceChannel && voiceChannel.members && voiceChannel.members.size === 1) {
                const message = player.data.get("message");
                
                if (message) {
                    try {
                        await message.delete();
                    } catch (error) {
                        console.error("Ошибка при удалении сообщения:", error);
                    }
                }
        
                const embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setDescription('Я ушла, потому что одной играть скучно.');
        
                const textChannel = client.channels.cache.get(player.textId);
                if (textChannel) await textChannel.send({ embeds: [embed] });
                await player.destroy();
                await pickPresence();
            }
        }, 60000);
        
}};