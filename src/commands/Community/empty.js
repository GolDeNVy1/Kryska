const { SlashCommandBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('empty')
        .setDescription('Очищает очередь')
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply();
        const ctx = await validateCommand(interaction, client.kazagumo);
        if (!ctx) return;
        const { player } = ctx;

        try {
            player.queue.clear();
            await interaction.followUp({
                embeds: [successEmbed('🗑️ Репертуар очищен', null, interaction.user)],
            });
        } catch (error) {
            logger.error('Empty', 'Failed to clear queue:', error);
            await interaction.followUp({
                embeds: [errorEmbed('У меня сломалась балалайка. Попробуй снова позже.', interaction.user)],
                ephemeral: true,
            });
        }
    },
};
