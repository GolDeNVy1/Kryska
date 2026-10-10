const { SlashCommandBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('insert')
        .setDescription('Добавлю песню сразу после текущей')
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName('song').setDescription('Ссылка или название').setRequired(true)),

    async execute(interaction, client) {
        await interaction.deferReply();
        const ctx = await validateCommand(interaction, client.kazagumo);
        if (!ctx) return;
        const { player } = ctx;
        const query = interaction.options.getString('song', true);

        try {
            const searchOptions = { requester: interaction.member };
            const { getAvailablePublicNode } = require('../../utils/nodes');

            if (query.includes('spotify.com')) {
                const availableNode = getAvailablePublicNode(client.kazagumo);
                if (availableNode) {
                    searchOptions.nodeName = availableNode;
                } else {
                    return interaction.followUp({ embeds: [errorEmbed('❌ Нет доступных публичных нод для загрузки Spotify.', interaction.user)], ephemeral: true });
                }
            }

            const result = await client.kazagumo.search(query, searchOptions);
            if (!result || !result.tracks.length) {
                return interaction.followUp({ embeds: [errorEmbed('Ничего не найдено.', interaction.user)], ephemeral: true });
            }
            player.queue.unshift(...result.tracks);
            const title = result.type === 'PLAYLIST'
                ? `**Следующее:** ${result.playlistName}`
                : `**Следующее:** ${result.tracks[0].title}`;
            await interaction.followUp({ embeds: [successEmbed(title, null, interaction.user)] });
        } catch (error) {
            logger.error('Insert', 'Failed:', error);
            await interaction.followUp({ embeds: [errorEmbed('Сломалась балалайка, попробуй снова.', interaction.user)], ephemeral: true });
        }
    },
};