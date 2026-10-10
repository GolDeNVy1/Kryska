const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');
const { fetchLyrics, parseLRC, getActiveLyricIndex } = require('../../utils/lyrics');
const { COLORS } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Показать текст текущей песни в реальном времени')
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: false });

        const ctx = await validateCommand(interaction, client.kazagumo);
        if (!ctx) return;

        const { player } = ctx;
        const currentTrack = player.queue.current;

        if (!currentTrack) {
            return interaction.followUp({
                embeds: [errorEmbed('Сейчас ничего не играет.', interaction.user)],
                ephemeral: true,
            });
        }

        // Clean title from "Official Video", "Lyrics", etc. to improve search results
        const cleanTitle = currentTrack.title
            .replace(/\[.*?\]|\(.*?\)/g, '')
            .replace(/(official|music|lyric|video|audio)/gi, '')
            .trim();

        await interaction.editReply({
            embeds: [infoEmbed('🔎 Ищу текст песни...', `Ищу: **${cleanTitle}** - **${currentTrack.author}**`, interaction.user)]
        });

        const lyricsData = await fetchLyrics(cleanTitle, currentTrack.author);

        if (lyricsData?.error === 'RATE_LIMIT') {
            return interaction.editReply({
                embeds: [errorEmbed('API текстов временно перегружен (Rate Limit). Пожалуйста, подождите немного.', interaction.user)]
            });
        }

        if (!lyricsData || (!lyricsData.syncedLyrics && !lyricsData.plainLyrics)) {
            return interaction.editReply({
                embeds: [errorEmbed(`Текст для песни **${currentTrack.title}** не найден.`, interaction.user)]
            });
        }

        // Handle unsynced (plain) lyrics
        if (!lyricsData.syncedLyrics) {
            const plainEmbed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setTitle(`📝 Текст: ${currentTrack.author} - ${currentTrack.title}`)
                .setDescription(lyricsData.plainLyrics.substring(0, 4000))
                .setFooter({ text: 'Синхронизированный текст не найден. Покажу обычный.' });
            
            return interaction.editReply({ embeds: [plainEmbed] });
        }

        // Handle synced lyrics
        const parsedLyrics = parseLRC(lyricsData.syncedLyrics);
        if (parsedLyrics.length === 0) {
            return interaction.editReply({
                embeds: [errorEmbed('Ошибка обработки формата текста.', interaction.user)]
            });
        }

        // Initial embed
        const lyricsEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle(`🎤 Караоке: ${currentTrack.author} - ${currentTrack.title}`)
            .setDescription('🎵 *Начинаем...*')
            .setFooter({ text: 'Синхронизация lrclib.net' });

        const message = await interaction.editReply({ embeds: [lyricsEmbed] });

        // Cleanup previous interval if exists
        if (player.data.has('lyricsInterval')) {
            clearInterval(player.data.get('lyricsInterval'));
        }

        // State for interval
        const state = {
            lastIndex: -2,
            message: message,
            parsedLyrics: parsedLyrics,
            trackUri: currentTrack.uri
        };

        const interval = setInterval(async () => {
            // Stop if player is gone or track changed
            if (!player || player.state === 'DISCONNECTED' || player.queue.current?.uri !== state.trackUri) {
                clearInterval(interval);
                return;
            }

            if (player.paused) return;

            const activeIndex = getActiveLyricIndex(state.parsedLyrics, player.position);

            // Only edit if the active line changed
            if (activeIndex !== state.lastIndex) {
                state.lastIndex = activeIndex;

                let description = '';
                
                if (activeIndex === -1) {
                    description = '🎵 *Ожидание начала...*\n\n' + (state.parsedLyrics[0]?.text || '');
                } else {
                    const prevLine = state.parsedLyrics[activeIndex - 1]?.text || '';
                    const currLine = state.parsedLyrics[activeIndex]?.text || '♪';
                    const nextLine = state.parsedLyrics[activeIndex + 1]?.text || '';
                    const nextNextLine = state.parsedLyrics[activeIndex + 2]?.text || '';

                    description = `*${prevLine}*\n\n**🎸 ${currLine} 🎸**\n\n*${nextLine}*\n*${nextNextLine}*`;
                }

                const updatedEmbed = EmbedBuilder.from(lyricsEmbed).setDescription(description || '♪');

                try {
                    await state.message.edit({ embeds: [updatedEmbed] });
                } catch (err) {
                    // Message might have been deleted by user
                    logger.warn('Lyrics', 'Failed to update lyrics message, stopping interval.');
                    clearInterval(interval);
                }
            }
        }, 2200);

        player.data.set('lyricsInterval', interval);
    },
};
