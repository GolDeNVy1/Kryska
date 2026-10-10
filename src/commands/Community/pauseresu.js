const { SlashCommandBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pauseresu')
        .setDescription('Остановлюсь и продолжу когда захочешь')
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply();

        const ctx = await validateCommand(interaction, client.kazagumo);
        if (!ctx) return;

        const { player } = ctx;

        try {
            const isPaused = player.paused;
            player.pause(!isPaused);

            const embed = isPaused
                ? successEmbed('▶️ Продолжаем!', `<@${interaction.user.id}> Окей, продолжаем!`, interaction.user)
                : successEmbed('⏸️ Пауза', `<@${interaction.user.id}> Подождать тебя, да?`, interaction.user);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            logger.error('PauseResume', 'Failed to toggle pause:', error);
            await interaction.followUp({
                embeds: [errorEmbed('У меня сломалась балалайка, подожди немного и попробуй снова.', interaction.user)],
                ephemeral: true,
            });
        }
    },
};
