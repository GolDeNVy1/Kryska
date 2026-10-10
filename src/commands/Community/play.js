const { SlashCommandBuilder } = require('discord.js');
const { validateCommand } = require('../../utils/checks');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { isYoutubeUrl, resolveYoutube } = require('../../utils/ytdlp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Начну играть музыку')
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription('Ссылка на музыку или запрос')
                .setRequired(true)),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: false });

        const query = interaction.options.getString('url');
        const kazagumo = client.kazagumo;

        const ctx = await validateCommand(interaction, kazagumo, { requirePlayer: false });
        if (!ctx) return;

        const { voiceChannel } = ctx;
        let { player } = ctx;

        // ─── Resolve shortened URLs ───────────────────────────────────────────────
        let finalQuery = query;
        if (query.match(/^https?:\/\/(link\.deezer\.com|deezer\.page\.link|spotify\.link|on\.soundcloud\.com)\//)) {
            try {
                const controller = new AbortController();
                const res = await fetch(query, {
                    method: 'GET',
                    redirect: 'follow',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    },
                });
                controller.abort(); // Don't download the body, we only need the final URL
                finalQuery = res.url;
                logger.info('Play', `Resolved short URL: ${query} → ${finalQuery}`);
            } catch (err) {
                logger.warn('Play', `Failed to resolve short URL: ${query} — ${err.message}`);
            }
        }

        // ─── Create player always on owo ─────────────────────────────────────────
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
                logger.error('Play', 'Failed to create player:', error);
                return interaction.followUp({
                    embeds: [errorEmbed('Не удалось подключиться к голосовому каналу.', interaction.user)],
                    ephemeral: true,
                });
            }
        }

        // ─── Search for tracks ────────────────────────────────────────────────────
        // Spotify: search on a public node to get metadata (owo lacks Spotify Premium).
        // Then strip the base64 track data so owo re-resolves the audio itself via
        // trackResolver (dzsearch/scsearch) — same pattern as sessionRecovery.js.
        // All other sources: search directly on owo.
const { searchSpotify } = require('../../utils/spotify');

        // ...

        let result;
        const isSpotifyUrl = finalQuery.includes('spotify.com') || finalQuery.includes('spotify.link');
        const isYtUrl = isYoutubeUrl(finalQuery);

        try {
            if (isSpotifyUrl) {
                result = await searchSpotify(finalQuery, kazagumo, interaction.member.user);
            } else if (isYtUrl) {
                // ── YouTube: bypass Lavalink's broken youtube-plugin via yt-dlp ──
                logger.info('Play', `YouTube URL detected, resolving via yt-dlp: ${finalQuery}`);
                const ytInfo = await resolveYoutube(finalQuery);

                if (!ytInfo) {
                    return interaction.followUp({
                        embeds: [errorEmbed('yt-dlp не смог получить ссылку на видео. Попробуй другое.', interaction.user)],
                        ephemeral: true,
                    });
                }

                // Load the direct stream URL as HTTP — Lavalink plays it natively
                result = await kazagumo.search(ytInfo.streamUrl, {
                    requester: interaction.member.user,
                    nodeName:  'owo',
                });

                // Patch metadata on the resolved track (HTTP track has no title etc.)
                if (result && result.tracks && result.tracks.length > 0) {
                    const t = result.tracks[0];
                    t.title      = ytInfo.title;
                    t.author     = ytInfo.author;
                    t.length     = ytInfo.duration;
                    t.thumbnail  = ytInfo.thumbnail;
                    t.sourceName = 'youtube'; // Fix icon
                    // Store original YT URL so playerStart can display it
                    t.realUri    = ytInfo.uri;
                    
                    const ytIdMatch = ytInfo.uri.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                    if (ytIdMatch && ytIdMatch[1]) {
                        t.identifier = ytIdMatch[1];
                    }
                }

                logger.info('Play', `yt-dlp resolved: "${ytInfo.title}" → HTTP stream`);
            } else {
                result = await kazagumo.search(finalQuery, {
                    requester: interaction.member.user,
                    nodeName: 'owo'
                });
            }
        } catch (error) {
            logger.error('Play', 'Search failed:', error);
            return interaction.followUp({
                embeds: [errorEmbed('Не удалось найти треки. Попробуй снова.', interaction.user)],
                ephemeral: true,
            });
        }

        if (!result || !result.tracks || !result.tracks.length) {
            return interaction.followUp({
                embeds: [errorEmbed('Прости, я не знаю как это играть.', interaction.user)],
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

        const text = result.type === 'PLAYLIST'
            ? `### Добавлено в репертуар: [${result.playlistName}](${finalQuery}) с \`${result.tracks.length}\` треками`
            : `### Добавлено в репертуар: [${result.tracks[0].title}](${result.tracks[0].realUri || finalQuery})`;

        await interaction.followUp({
            embeds: [infoEmbed(null, text, interaction.user)],
        });
    },
};
