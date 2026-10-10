const { SlashCommandBuilder } = require('discord.js');
const { getQueuePage } = require('../../utils/getQueuePage');
const { validateCommand } = require('../../utils/checks');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Показывает весь мой репертуар с перелистыванием')
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const ctx = await validateCommand(interaction, client.kazagumo);
        if (!ctx) return;

        const queueData = getQueuePage(ctx.player, 0);
        return interaction.followUp({ ...queueData, ephemeral: true });
    },
};
