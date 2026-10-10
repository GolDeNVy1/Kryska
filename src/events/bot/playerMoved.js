const { Events } = require('kazagumo');
const logger = require('../../utils/logger');

module.exports = {
    name: Events.PlayerMoved,

    async execute(client, player, state, channels) {
        logger.info('PlayerMoved', `Бот перемещен. Состояние: ${state}. Каналы: ${channels?.oldChannelId} -> ${channels?.newChannelId}`);

        if (channels && channels.newChannelId) {
            // Обновляем voiceId в плеере, чтобы команды и кнопки снова работали!
            player.voiceId = channels.newChannelId;
            logger.info('PlayerMoved', `Обновлен voiceId плеера на ${player.voiceId}`);
            
            // На всякий случай снимаем с паузы, если при перетаскивании Lavalink автоматически ставит паузу
            if (player.paused) {
                player.pause(false);
                logger.info('PlayerMoved', `Снял плеер с паузы после перемещения`);
            }
        }
    },
};
