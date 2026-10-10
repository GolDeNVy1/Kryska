const { SlashCommandBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Перемешиваю свой репертуар')
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const ctx = await validateCommand(interaction, client.kazagumo);
        if (!ctx) return;

        const { player } = ctx;

        try {
            if (player.queue.length < 2) {
                return interaction.followUp({
                    embeds: [errorEmbed('Добавьте больше треков, чтобы их можно было перемешать.', interaction.user)],
                    ephemeral: true,
                });
            }

            player.queue.shuffle();

            await interaction.followUp({
                embeds: [successEmbed(
                    '🔀 Репертуар перемешан!',
                    `<@${interaction.user.id}> теперь можно наслаждаться музыкой в случайном порядке!`,
                    interaction.user,
                )],
            });
        } catch (error) {
            logger.error('Shuffle', 'Failed to shuffle queue:', error);
            await interaction.followUp({
                embeds: [errorEmbed('У меня сломалась балалайка, подожди немного и попробуй снова.', interaction.user)],
                ephemeral: true,
            });
        }
    },
};
