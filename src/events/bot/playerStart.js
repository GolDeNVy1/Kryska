const { Events } = require('kazagumo');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ActivityType, AttachmentBuilder } = require('discord.js');
const { getPlatformStyle, RAT_GIF } = require('../../constants/platforms');
const { formatTime } = require('../../utils/formatTime');
const logger = require('../../utils/logger');

/**
 * Create a visual progress bar for the currently playing track.
 */
function createProgressBar(current, total) {
    const barLength = 16;
    const progressIndex = Math.min(Math.floor((current / total) * barLength), barLength - 1);
    const before = '▬'.repeat(progressIndex);
    const after = '▬'.repeat(barLength - progressIndex - 1);
    return `${before}🔘${after}`;
}

module.exports = {
    name: Events.PlayerStart,

    async execute(client, player, track) {
        // Clear disconnect timeout if it exists
        if (player.data.has('disconnectTimeout')) {
            clearTimeout(player.data.get('disconnectTimeout'));
            player.data.delete('disconnectTimeout');
        }

        // ─── Network Drop Recovery Auto-Seek ─────────────────────────────
        // If this track was auto-restarted due to a network stream drop,
        // seek to the saved position immediately.
        if (track.retryPosition && track.retryPosition > 0) {
            logger.info('PlayerStart', `Track has retryPosition. Seeking to ${track.retryPosition}ms...`);
            setTimeout(() => {
                player.seek(track.retryPosition).catch(() => {});
                // Clean up so it doesn't seek again if looped
                track.retryPosition = null; 
            }, 500); // Small delay to let Lavalink initialize the stream
        }

        // Clear previous progress interval
        if (player.data.has('progressInterval')) {
            clearInterval(player.data.get('progressInterval'));
            player.data.delete('progressInterval');
        }

        logger.info('PlayerStart', `Resolving platform style for sourceName: "${track.sourceName}" (type: ${typeof track.sourceName})`);

        // Resolve platform style (local GIF + color)
        const { file, icon, color } = getPlatformStyle(track.sourceName);

        // Build attachment from local GIF
        const files = [];
        if (file) {
            try {
                files.push(new AttachmentBuilder(file.path, { name: file.name }));
            } catch (err) {
                logger.warn('PlayerStart', `Could not load platform GIF: ${file.path}`, err.message);
            }
        }

        // Add rat spinning GIF attachment
        try {
            files.push(new AttachmentBuilder(RAT_GIF.path, { name: RAT_GIF.name }));
        } catch (err) {
            logger.warn('PlayerStart', `Could not load rat GIF: ${RAT_GIF.path}`, err.message);
        }

        // Get voice channel name
        const guild = client.guilds.cache.get(player.guildId);
        const voiceChannel = guild?.channels.cache.get(player.voiceId);
        const channelName = voiceChannel?.name || 'Неизвестный канал';

        // Build "Now Playing" embed
        const description = `## [${track.title}](${track.realUri})`;
        const nowPlayingEmbed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: '🎸 Сейчас играю 🎸', iconURL: icon })
            .setDescription(`${description}\n\n${createProgressBar(0, track.length)}  ${formatTime(0)} / ${formatTime(track.length)}`)
            .addFields(
                { name: '🎶 Заказал', value: `<@${track.requester.id}>`, inline: true },
                { name: '🎤 Автор', value: track.author, inline: true },
                { name: '⏱️ Длительность', value: `\`${formatTime(track.length)}\``, inline: true },
            )
            .setImage(track.thumbnail)
            .setFooter({
                text: `Навожу суету в: "${channelName}" 😎`,
                iconURL: `attachment://${RAT_GIF.name}`,
            });

        // Control buttons — Row 1
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('stop').setLabel('⏹️').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('previous').setLabel('⏮').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('pause_resume').setLabel('⏯️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('skip').setLabel('⏭').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('shuffle').setLabel('🔀').setStyle(ButtonStyle.Secondary),
        );

        // Control buttons — Row 2
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('clear_queue').setLabel('🗑️').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('show_queue').setLabel('📜').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('back_5s').setLabel('⏪ 5s').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('forward_5s').setLabel('⏩ 5s').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('repeat').setLabel(
                player.loop === 'track' ? '🔂' : player.loop === 'queue' ? '🔁' : '🔁❌'
            ).setStyle(ButtonStyle.Secondary),
        );

        // Send the embed (no file attachments — icons use external URLs)
        const channel = client.channels.cache.get(player.textId);
        if (!channel) return;

        try {
            const message = await channel.send({ embeds: [nowPlayingEmbed], components: [row1, row2], files });
            player.data.set('message', message);

            // Progress bar update loop with dynamic interval
            const updateProgress = async () => {
                // Stop loop if player disconnected, track changed, or paused
                if (!player || player.state === 'DISCONNECTED' || player.queue.current?.uri !== track.uri) return;

                if (!player.paused && player.queue.current) {
                    const currentDuration = player.position;
                    if (currentDuration < track.length) {
                        try {
                            const updatedEmbed = EmbedBuilder.from(nowPlayingEmbed)
                                .setDescription(`${description}\n\n${createProgressBar(currentDuration, track.length)}  ${formatTime(currentDuration)} / ${formatTime(track.length)}`);
                            await message.edit({ embeds: [updatedEmbed] });
                        } catch {
                            // Message deleted or error — stop updating
                            return;
                        }
                    }
                }

                // If lyrics are active, slow down to 5 seconds to avoid Discord Rate Limits.
                // Otherwise, use 3 seconds for smoother progress bar.
                const hasLyrics = player.data.has('lyricsInterval');
                const nextDelay = hasLyrics ? 5000 : 3000;
                
                const timeoutId = setTimeout(updateProgress, nextDelay);
                player.data.set('progressInterval', timeoutId);
            };

            // Start the initial loop
            const initialTimeoutId = setTimeout(updateProgress, 3000);
            player.data.set('progressInterval', initialTimeoutId);

            // Update bot activity
            client.user.setActivity({
                name: `${track.author} - ${track.title}`,
                type: ActivityType.Listening,
            });
        } catch (error) {
            logger.error('PlayerStart', 'Failed to send Now Playing embed:', error);
        }

        // Auto-leave if alone in channel after 60s
        setTimeout(async () => {
            try {
                const vc = client.channels.cache.get(player.voiceId);
                if (vc?.members.size === 1) {
                    const msg = player.data.get('message');
                    if (msg) await msg.delete().catch(() => {});

                    const embed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setDescription('Я ушла, потому что одной играть скучно.');

                    const textChannel = client.channels.cache.get(player.textId);
                    if (textChannel) await textChannel.send({ embeds: [embed] });
                    client.selfDisconnecting.add(player.guildId);
                    await player.destroy();
                }
            } catch (error) {
                logger.warn('PlayerStart', 'Auto-leave error:', error.message);
            }
        }, 60000);
    },
};
