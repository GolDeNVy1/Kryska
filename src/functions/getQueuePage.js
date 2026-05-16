const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Генерирует эмбед и кнопки для страницы очереди
 * @param {Object} player - Объект плеера Kazagumo
 * @param {number} page - Текущая страница (0-indexed)
 * @returns {Object} - { embeds: [EmbedBuilder], components: [ActionRowBuilder] }
 */
function getQueuePage(player, page = 0) {
    const itemsPerPage = 10;
    const totalTracks = player.queue.length;
    const totalPages = Math.ceil(totalTracks / itemsPerPage) || 1;
    
    // Ограничение страницы в пределах допустимого
    if (page < 0) page = 0;
    if (page >= totalPages) page = totalPages - 1;

    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const tracks = player.queue.slice(start, end);

    const embed = new EmbedBuilder()
        .setColor(0xff6347)
        .setTitle('🎶 Мой репертуар на сегодня')
        .setDescription(`**Сейчас играю:**\n[${player.queue.current.title}](${player.queue.current.uri})\n\n**Далее по списку (Страница ${page + 1}/${totalPages}):**`)
        .setFooter({ text: `Всего песен в очереди: ${totalTracks}` });

    if (player.queue.current.thumbnail) {
        embed.setThumbnail(player.queue.current.thumbnail);
    }

    if (tracks.length === 0) {
        embed.addFields({ name: 'Впереди пусто...', value: 'Добавьте еще песен, чтобы продолжить веселье!' });
    } else {
        const trackList = tracks.map((track, index) => {
            const trackIndex = start + index + 1;
            const trackTitle = track.title.length > 30 
                ? `${track.title.substring(0, 30)}...` 
                : track.title;
            return `\`${trackIndex}.\` [${trackTitle}](${track.uri}) - ${track.author} (<@${track.requester.id}>)`;
        });

        let currentFieldContent = "";
        let fieldIndex = 1;

        trackList.forEach((line, index) => {
            if ((currentFieldContent + line + "\n").length > 1024) {
                embed.addFields({ name: fieldIndex === 1 ? 'Очередь:' : '‎', value: currentFieldContent });
                currentFieldContent = line + "\n";
                fieldIndex++;
            } else {
                currentFieldContent += line + "\n";
            }
        });

        if (currentFieldContent) {
            embed.addFields({ name: fieldIndex === 1 ? 'Очередь:' : '‎', value: currentFieldContent });
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
            .setDisabled(page >= totalPages - 1)
    );

    return { embeds: [embed], components: [row] };
}

module.exports = { getQueuePage };
