const { SlashCommandBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play-ext')
        .setDescription('Усовершенствованная команда — выбери платформу для поиска')
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('source')
                .setDescription('Выбери сервис для поиска')
                .setRequired(true)
                .addChoices(
                    { name: 'YouTube', value: 'youtube' },
                    { name: 'SoundCloud', value: 'soundcloud' },
                ))
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription('Ссылка на музыку или запрос')
                .setRequired(true)),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: false });

        const query = interaction.options.getString('url');
        const source = interaction.options.getString('source');
        const kazagumo = client.kazagumo;

        const ctx = await validateCommand(interaction, kazagumo, { requirePlayer: false });
        if (!ctx) return;

        const { voiceChannel } = ctx;
        let { player } = ctx;

        // Create player if it doesn't exist
        if (!player) {
            try {
                player = await kazagumo.createPlayer({
                    guildId: interaction.guild.id,
                    textId: interaction.channel.id,
                    voiceId: voiceChannel.id,
                    volume: 100,
                    deaf: true,
                    nodeName: 'owo',
                });
            } catch (error) {
                logger.error('PlayExt', 'Failed to create player:', error);
                return interaction.followUp({
                    embeds: [errorEmbed('Не удалось подключиться к голосовому каналу.', interaction.user)],
                    ephemeral: true,
                });
            }
        }

        // Build search query with selected engine
        let result;
        try {
            // Resolve shortened URLs (like link.deezer.com)
            let finalQuery = query;
            if (query.match(/^https?:\/\/(link\.deezer\.com|deezer\.page\.link|spotify\.link|on\.soundcloud\.com)\//)) {
                try {
                    const res = await fetch(query, { method: 'HEAD' });
                    finalQuery = res.url;
                } catch (err) {
                    logger.warn('PlayExt', `Failed to resolve short URL: ${query}`);
                }
            }

            const searchQuery = finalQuery;
            const isSpotifyUrl = searchQuery.includes('spotify.com') || searchQuery.includes('spotify.link');

            if (isSpotifyUrl) {
                const { searchSpotify } = require('../../utils/spotify');
                result = await searchSpotify(searchQuery, kazagumo, interaction.member.user);
            } else {
                const searchOptions = { 
                    requester: interaction.member.user,
                    engine: source === 'soundcloud' ? 'soundcloud' : 'youtube_music',
                    nodeName: 'owo'
                };
                result = await kazagumo.search(searchQuery, searchOptions);
            }
        } catch (error) {
            logger.error('PlayExt', 'Search failed:', error);
            return interaction.followUp({
                embeds: [errorEmbed('Не удалось найти треки. Попробуй снова.', interaction.user)],
                ephemeral: true,
            });
        }

        if (!result.tracks.length) {
            return interaction.followUp({
                embeds: [errorEmbed('Извини, я не знаю, как это играть :(', interaction.user)],
                ephemeral: true,
            });
        }

        const tracks = result.type === 'PLAYLIST' ? result.tracks : [result.tracks[0]];
        for (const track of tracks) {
            if (result._isSpotifyBypass) {
                track.sourceName = 'spotify';
            }
            player.queue.add(track);
        }

        if (!player.playing && !player.paused) {
            player.play();
        }

        const title = result.type === 'PLAYLIST'
            ? `**Добавлено в очередь:** ${result.playlistName}`
            : `**Добавлено в очередь:** ${result.tracks[0].title}`;

        await interaction.followUp({
            embeds: [infoEmbed(title, null, interaction.user)],
        });
    },
};
