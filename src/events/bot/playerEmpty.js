const { EmbedBuilder, ActivityType } = require('discord.js');
const { Events } = require('kazagumo');
const logger = require('../../utils/logger');

module.exports = {
    name: Events.PlayerEmpty,

    async execute(client, player) {
        // Clean up progress interval
        if (player.data.has('progressInterval')) {
            clearInterval(player.data.get('progressInterval'));
            player.data.delete('progressInterval');
        }

        // Clean up lyrics interval
        if (player.data.has('lyricsInterval')) {
            clearInterval(player.data.get('lyricsInterval'));
            player.data.delete('lyricsInterval');
        }

        // Delete "Now Playing" message
        const lastMessage = player.data.get('message');
        if (lastMessage?.deletable) {
            try {
                await lastMessage.delete();
            } catch (error) {
                if (error.code === 10008) {
                    logger.warn('PlayerEmpty', `Message ${lastMessage.id} already deleted.`);
                } else {
                    logger.error('PlayerEmpty', 'Failed to delete Now Playing message:', error);
                }
            }
            player.data.delete('message');
        }

        // Notify that queue is empty
        if (!player.queue.length) {
            const channel = client.channels.cache.get(player.textId);
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription('Репертуар закончился, если хочешь закажи ещё песенку).');
                await channel.send({ embeds: [embed] });
            }

            // Clear existing disconnect timer
            if (player.data.has('disconnectTimeout')) {
                clearTimeout(player.data.get('disconnectTimeout'));
                player.data.delete('disconnectTimeout');
            }

            // Auto-disconnect after 60 seconds of inactivity
            const timeout = setTimeout(async () => {
                try {
                    if (!player.queue.length) {
                        client.selfDisconnecting.add(player.guildId);
                        await player.destroy();
                        const textChannel = client.channels.cache.get(player.textId);
                        if (textChannel) {
                            const embed = new EmbedBuilder()
                                .setColor(0xFF0000)
                                .setDescription('Я пойду, у меня ещё много дел, позовёте когда будет скучно без музыки ;)');
                            await textChannel.send({ embeds: [embed] });
                        }
                    }
                } catch (error) {
                    logger.warn('PlayerEmpty', 'Auto-disconnect error:', error.message);
                }
            }, 60000);

            player.data.set('disconnectTimeout', timeout);
        }

        // Reset bot presence to idle
        try {
            await client.user.setPresence({
                activities: [{ name: 'Ем сыр 🧀', type: ActivityType.Custom }],
                status: 'idle',
            });
        } catch (error) {
            logger.error('PlayerEmpty', 'Failed to reset presence:', error);
        }
    },
};