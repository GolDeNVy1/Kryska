const { EmbedBuilder } = require('discord.js');
const { Events } = require('kazagumo');
const logger = require('../../utils/logger');
const { recoverSession, isInCooldown } = require('../../utils/sessionRecovery');

module.exports = {
    name: Events.PlayerResolveError,

    async execute(client, player, track, err) {
        const errorStr = String(err);
        const guildId = player.guildId;

        // ─── Stale player check: ignore errors from old/replaced players ─
        // After recovery, a NEW player is created for the guild. But Kazagumo
        // continues firing resolve errors from the OLD player's queue (1200+
        // tracks × 160ms each = minutes of stale errors). Comparing the player
        // reference against the current active player catches ALL of them,
        // regardless of how long the drain takes.
        const currentPlayer = client.kazagumo?.players?.get(guildId);
        if (currentPlayer && currentPlayer !== player) {
            return; // Stale error from a replaced player — silently ignore
        }

        // ─── Cooldown: secondary safety net ─────────────────────────────
        // Catches edge cases where the old player is destroyed but the new
        // one hasn't been registered yet (brief window during createPlayer).
        if (isInCooldown(guildId)) {
            return;
        }

        logger.error('PlayerResolveError', `Track "${track.title}" in guild ${guildId}:`, err);

        // ─── Session not found → centralized recovery ──────────────────
        if (errorStr.toLowerCase().includes('session not found')) {
            logger.warn('PlayerResolveError', `Session lost for guild ${guildId}. Delegating to recovery manager...`);
            await recoverSession(client, player, track, 'PlayerResolveError');
            return;
        }

        // ─── Generic error — show message ────────────────────────────────
        const textChannel = client.channels.cache.get(player.textId);
        if (textChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Ошибка при обработке трека')
                .setDescription(`Не удалось загрузить трек: **${track.title}**.\nОшибка: \`${err}\``);

            await textChannel.send({ embeds: [errorEmbed] }).catch(() => {});
        }
    },
};
