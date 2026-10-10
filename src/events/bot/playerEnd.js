const { Events } = require('kazagumo');
const logger = require('../../utils/logger');

module.exports = {
    name: Events.PlayerEnd,

    async execute(client, player, track) {
        // Clean up progress interval from playerStart
        if (player.data.has('progressInterval')) {
            clearTimeout(player.data.get('progressInterval'));
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
                    logger.warn('PlayerEnd', `Message ${lastMessage.id} already deleted.`);
                } else {
                    logger.error('PlayerEnd', 'Failed to delete Now Playing message:', error);
                }
            }
            player.data.delete('message');
        }

    },
};