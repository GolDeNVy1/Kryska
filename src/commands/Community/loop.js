const { SlashCommandBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Буду играть одно и то же (песню или даже всю очередь)')
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('Режим повторения')
                .setRequired(true)
                .addChoices(
                    { name: 'Выключить', value: 'none' },
                    { name: 'Трек', value: 'track' },
                    { name: 'Очередь', value: 'queue' },
                )),

    async execute(interaction, client) {
        await interaction.deferReply();

        const ctx = await validateCommand(interaction, client.kazagumo);
        if (!ctx) return;

        const { player } = ctx;
        const mode = interaction.options.getString('mode');

        try {
            await player.setLoop(mode);

            const modeLabels = { none: 'выключено', track: 'песню', queue: 'очередь' };
            await interaction.followUp({
                embeds: [successEmbed(
                    '🔄 Повторение настроено!',
                    `<@${interaction.user.id}> Окей, повторяю: ${modeLabels[mode]}.`,
                    interaction.user,
                )],
            });
        } catch (error) {
            logger.error('Loop', 'Failed to set loop mode:', error);
            await interaction.followUp({
                embeds: [errorEmbed('У меня сломалась балалайка, подожди немного и попробуй снова.', interaction.user)],
                ephemeral: true,
            });
        }
    },
};
