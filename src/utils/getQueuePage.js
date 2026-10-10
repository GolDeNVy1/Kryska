const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../utils/embeds');

/**
 * Generate an embed and buttons for a queue page.
 * @param {object} player - Kazagumo player object
 * @param {number} page - Current page (0-indexed)
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function getQueuePage(player, page = 0) {
    const itemsPerPage = 10;
    const totalTracks = player.queue.length;
    const totalPages = Math.ceil(totalTracks / itemsPerPage) || 1;

    // Clamp page within bounds
    page = Math.max(0, Math.min(page, totalPages - 1));

    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const tracks = player.queue.slice(start, end);

    const currentTitle = player.queue.current?.title || 'Неизвестно';
    const currentUri = player.queue.current?.uri || '';

    const embed = new EmbedBuilder()
        .setColor(COLORS.QUEUE)
        .setTitle('🎶 Мой репертуар на сегодня')
        .setDescription(
            `**Сейчас играю:**\n[${currentTitle}](${currentUri})\n\n` +
            `**Далее по списку (Страница ${page + 1}/${totalPages}):**`
        )
        .setFooter({ text: `Всего песен в очереди: ${totalTracks}` });

    if (player.queue.current?.thumbnail) {
        embed.setThumbnail(player.queue.current.thumbnail);
    }

    if (tracks.length === 0) {
        embed.addFields({ name: 'Впереди пусто...', value: 'Добавьте еще песен!' });
    } else {
        const trackList = tracks.map((track, index) => {
            const num = start + index + 1;
            const title = track.title.length > 30
                ? `${track.title.substring(0, 30)}...`
                : track.title;
            return `\`${num}.\` [${title}](${track.uri}) - ${track.author} (<@${track.requester.id}>)`;
        });

        // Split into embed fields if too long (1024 char limit)
        let currentContent = '';
        let fieldIndex = 1;

        for (const line of trackList) {
            if ((currentContent + line + '\n').length > 1024) {
                embed.addFields({ name: fieldIndex === 1 ? 'Очередь:' : '‎', value: currentContent });
                currentContent = line + '\n';
                fieldIndex++;
            } else {
                currentContent += line + '\n';
            }
        }

        if (currentContent) {
            embed.addFields({ name: fieldIndex === 1 ? 'Очередь:' : '‎', value: currentContent });
        }
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`queue_page_${page - 1}`)
            .setLabel('⬅️ Назад')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`queue_page_${page + 1}`)
            .setLabel('Вперед ➡️')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages - 1),
    );

    return { embeds: [embed], components: [row] };
}

module.exports = { getQueuePage };
