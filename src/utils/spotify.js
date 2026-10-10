const { getPreview, getTracks } = require('spotify-url-info')(fetch);
const logger = require('./logger');

/**
 * Resolves a Spotify URL into KazagumoSearchResult by scraping metadata locally
 * and querying Deezer concurrently on the owo node.
 * @param {string} url
 * @param {object} kazagumo
 * @param {object} requester
 * @returns {Promise<object>} KazagumoSearchResult-like object
 */
async function searchSpotify(url, kazagumo, requester) {
    const result = { type: 'SEARCH', tracks: [], playlistName: 'Spotify', _isSpotifyBypass: true };
    try {
        let queries = [];
        if (url.includes('/track/')) {
            const preview = await getPreview(url);
            if (preview && preview.title && preview.artist) {
                queries = [`${preview.artist} - ${preview.title}`];
            }
        } else if (url.includes('/playlist/') || url.includes('/album/')) {
            const tracks = await getTracks(url);
            if (tracks && tracks.length > 0) {
                queries = tracks.map(t => `${t.artist || ''} - ${t.name || t.title || ''}`);
                result.type = 'PLAYLIST';
                
                // Get playlist name if possible
                const preview = await getPreview(url).catch(() => null);
                if (preview && preview.title) result.playlistName = preview.title;
            }
        }

        if (queries.length === 0) return result;

        if (queries.length === 1) {
            let res = await kazagumo.search(queries[0], { requester, nodeName: 'owo', source: 'dzsearch:' });
            if (!res || !res.tracks || !res.tracks.length) {
                res = await kazagumo.search(queries[0], { requester, nodeName: 'owo', engine: 'soundcloud' });
            }
            if (res && res.tracks && res.tracks.length > 0) {
                result.tracks.push(res.tracks[0]);
            }
            return result;
        }

        // Concurrent search for playlists to avoid timeout
        const promises = queries.map(async q => {
            let res = await kazagumo.search(q, { requester, nodeName: 'owo', source: 'dzsearch:' }).catch(() => null);
            if (!res || !res.tracks || !res.tracks.length) {
                res = await kazagumo.search(q, { requester, nodeName: 'owo', engine: 'soundcloud' }).catch(() => null);
            }
            return res;
        });
        const responses = await Promise.all(promises);
        
        for (const res of responses) {
            if (res && res.tracks && res.tracks.length > 0) {
                result.tracks.push(res.tracks[0]);
            }
        }

    } catch (error) {
        logger.error('Spotify', 'Failed to search Spotify:', error);
    }
    return result;
}

module.exports = { searchSpotify };
