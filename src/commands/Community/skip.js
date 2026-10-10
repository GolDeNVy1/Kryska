const { SlashCommandBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Пропускаю твою нелюбимую песню')
        .addIntegerOption(option =>
            option
                .setName('index')
                .setDescription('Индекс трека для пропуска')
                .setRequired(false))
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const ctx = await validateCommand(interaction, client.kazagumo);
        if (!ctx) return;

        const { player } = ctx;
        const index = interaction.options.getInteger('index');

        try {
            if (index === null) {
                // Skip current track
                const skippedTitle = player.queue.current?.title || 'Неизвестная песня';
                await player.skip();

                await interaction.followUp({
                    embeds: [successEmbed(
                        '⏭ Трек пропущен',
                        `<@${interaction.user.id}> пропустил(а): **${skippedTitle}**! Теперь следующая.`,
                        interaction.user,
                    )],
                });
            } else {
                // Skip to specific index
                if (index < 1 || index > player.queue.size) {
                    return interaction.followUp({
                        embeds: [errorEmbed(
                            `Указанный индекс должен быть от 1 до ${player.queue.size}.`,
                            interaction.user,
                        )],
                        ephemeral: true,
                    });
                }

                const targetTrack = player.queue.at(index - 1);
                const targetTitle = targetTrack?.title || 'Неизвестная песня';

                player.queue.splice(0, index - 1);
                await player.skip();

                await interaction.followUp({
                    embeds: [successEmbed(
                        '⏭ Трек пропущен',
                        `<@${interaction.user.id}> пропустил(а) до: №\`${index}\`. **${targetTitle}**!`,
                        interaction.user,
                    )],
                });
            }
        } catch (error) {
            logger.error('Skip', 'Failed to skip track:', error);
            await interaction.followUp({
                embeds: [errorEmbed('У меня сломалась балалайка, подожди немного и попробуй снова.', interaction.user)],
                ephemeral: true,
            });
        }
    },
};
