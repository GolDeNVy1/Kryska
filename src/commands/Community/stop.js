const { SlashCommandBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Заканчиваю свой концерт')
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply();

        const ctx = await validateCommand(interaction, client.kazagumo);
        if (!ctx) return;

        const { player } = ctx;

        try {
            // Clean up "Now Playing" message
            const lastMessage = player.data.get('message');
            if (lastMessage) {
                try {
                    await lastMessage.delete();
                } catch (deleteError) {
                    logger.warn('Stop', 'Could not delete Now Playing message:', deleteError.message);
                }
                player.data.delete('message');
            }

            client.selfDisconnecting.add(interaction.guildId);
            await player.destroy();

            await interaction.followUp({
                embeds: [successEmbed(
                    '🎼 Концерт окончен',
                    `Ладно, с вас хватит, <@${interaction.user.id}>, ещё увидимся 😉`,
                    interaction.user,
                )],
            });
        } catch (error) {
            // Ignore 400 Bad Request when session is already destroyed
            if (error?.status === 400) {
                logger.warn('Stop', 'Player already destroyed (400 Bad Request), ignoring.');
                try {
                    await interaction.followUp({
                        embeds: [successEmbed('⏹️ Воспроизведение остановлено', 'Позовёте, когда станет скучно.', interaction.user)],
                        ephemeral: true,
                    });
                } catch (_) { /* noop */ }
                return;
            }

            logger.error('Stop', 'Failed to stop player:', error);
            await interaction.followUp({
                embeds: [errorEmbed('У меня сломалась балалайка, подожди немного и попробуй снова.', interaction.user)],
                ephemeral: true,
            });
        }
    },
};
