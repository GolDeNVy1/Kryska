const { SlashCommandBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('previous')
        .setDescription('Возвращаюсь к предыдущему треку')
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply();

        const ctx = await validateCommand(interaction, client.kazagumo);
        if (!ctx) return;

        const { player } = ctx;

        try {
            const previousTrack = player.getPrevious();
            if (!previousTrack) {
                return interaction.followUp({
                    embeds: [errorEmbed('Извини, я не помню, что было до этого. Отправь ссылку заново!', interaction.user)],
                    ephemeral: true,
                });
            }

            await player.play(player.getPrevious(true));

            await interaction.followUp({
                embeds: [successEmbed(
                    '⏮ Воспроизведение предыдущего трека',
                    `Теперь играет: **${previousTrack.title}**`,
                    interaction.user,
                )],
            });
        } catch (error) {
            logger.error('Previous', 'Failed to play previous track:', error);
            await interaction.followUp({
                embeds: [errorEmbed('Произошла ошибка при попытке воспроизвести предыдущий трек.', interaction.user)],
                ephemeral: true,
            });
        }
    },
};
