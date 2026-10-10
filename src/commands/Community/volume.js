const { SlashCommandBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Играю громче или тише по твоему желанию')
        .setDMPermission(false)
        .addIntegerOption(option =>
            option
                .setName('volume')
                .setDescription('Желаемая громкость (0–200)')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(200)),

    async execute(interaction, client) {
        await interaction.deferReply();

        const ctx = await validateCommand(interaction, client.kazagumo);
        if (!ctx) return;

        const { player } = ctx;
        const volume = interaction.options.getInteger('volume');

        try {
            await player.setVolume(volume);

            await interaction.followUp({
                embeds: [successEmbed(
                    '🔊 Громкость изменена',
                    `Громкость изменена до **${volume}%**`,
                    interaction.user,
                )],
            });
        } catch (error) {
            logger.error('Volume', 'Failed to set volume:', error);
            await interaction.followUp({
                embeds: [errorEmbed('У меня сломалась балалайка, подожди немного и попробуй снова.', interaction.user)],
                ephemeral: true,
            });
        }
    },
};
