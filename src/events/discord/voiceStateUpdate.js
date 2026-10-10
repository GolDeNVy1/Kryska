const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embeds');
const { KICK_GIF } = require('../../constants/platforms');
const logger = require('../../utils/logger');

module.exports = {
    name: 'voiceStateUpdate',

    async execute(oldState, newState, client) {
        // Проверяем, что событие относится к самому боту
        if (newState.id !== client.user.id) return;

        // Если бот был перенесён в другой канал (перетаскивание админом)
        if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            const player = client.kazagumo.players.get(newState.guild.id);
            if (player) {
                player.voiceId = newState.channelId;
                logger.info('VoiceState', `Бот перенесён в канал ${newState.channelId}. Плеер обновлён.`);
                
                // Снимаем с паузы на всякий случай
                if (player.paused) {
                    player.pause(false);
                }
            }
        }

        // Если бот был в голосовом канале и теперь его там нет (выгнали)
        if (oldState.channelId && !newState.channelId) {
            // Проверяем, не ушёл ли бот сам (stop, auto-disconnect и т.д.)
            if (client.selfDisconnecting.has(newState.guild.id)) {
                client.selfDisconnecting.delete(newState.guild.id);
                logger.info('VoiceState', `Бот сам покинул канал в гильдии ${newState.guild.id}. Кик-сообщение не отправляем.`);
                return;
            }

            const player = client.kazagumo.players.get(newState.guild.id);

            if (player) {
                logger.warn('VoiceState', `Бот был кикнут из канала в гильдии ${newState.guild.id}. Убиваем плеер.`);

                const textChannel = client.channels.cache.get(player.textId);

                try {
                    await player.destroy();
                } catch (error) {
                    logger.error('VoiceState', 'Ошибка при уничтожении плеера после кика:', error);
                }

                if (textChannel) {
                    // Прикрепляем GIF "за что"
                    const files = [];
                    try {
                        const attachment = new AttachmentBuilder(KICK_GIF.path, { name: KICK_GIF.name });
                        files.push(attachment);
                    } catch (err) {
                        logger.warn('VoiceState', 'Could not load kick GIF:', err.message);
                    }

                    const embed = new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setDescription('Меня выгнали из голосового канала 😭');

                    // Если GIF загрузился, показываем его в эмбеде
                    if (files.length > 0) {
                        embed.setImage(`attachment://${KICK_GIF.name}`);
                    }

                    await textChannel.send({ embeds: [embed], files }).catch(() => { });
                }
            }
        }
    },
};
