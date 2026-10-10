const { EmbedBuilder } = require('discord.js');
const { Events } = require('kazagumo');
const logger = require('../../utils/logger');
const { recoverSession, isInCooldown } = require('../../utils/sessionRecovery');

module.exports = {
    name: Events.PlayerError,

    async execute(client, player, track, err) {
        const errorStr = String(err);
        const guildId = player.guildId;

        // ─── Stale player check ─────────────────────────────────────────
        const currentPlayer = client.kazagumo?.players?.get(guildId);
        if (currentPlayer && currentPlayer !== player) {
            return;
        }

        // ─── Cooldown: secondary safety net ─────────────────────────────
        if (isInCooldown(guildId)) {
            return;
        }

        logger.error('PlayerError', `Guild ${guildId}:`, err);

        // ─── Session not found → centralized recovery ──────────────────
        if (errorStr.toLowerCase().includes('session not found')) {
            logger.warn('PlayerError', `Session lost for guild ${guildId}. Delegating to recovery manager...`);
            await recoverSession(client, player, track, 'PlayerError');
            return;
        }



        // ─── Generic error ───────────────────────────────────────────────
        const textChannel = client.channels.cache.get(player.textId);
        if (textChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Ошибка воспроизведения')
                .setDescription(`Произошла ошибка при воспроизведении трека **${track?.title || 'Неизвестно'}**.\nОшибка: \`${err}\``)
                .setFooter({ text: 'Пропускаю трек... Обратитесь к администратору, если проблема не решится.' });

            await textChannel.send({ embeds: [errorEmbed] }).catch(() => {});
        }
    },
};
