const logger = require('./logger');

/**
 * Fetch lyrics from lrclib.net
 * @param {string} trackName 
 * @param {string} artistName 
 * @returns {Promise<{ syncedLyrics: string, plainLyrics: string } | null>}
 */
async function fetchLyrics(trackName, artistName) {
    try {
        const query = encodeURIComponent(`${trackName} ${artistName}`);
        const response = await fetch(`https://lrclib.net/api/search?q=${query}`, {
            headers: {
                'User-Agent': 'KryskaBot/2.0 (https://github.com/GolDeNVy1/Kryska)'
            }
        });

        const remaining = response.headers.get('X-RateLimit-Remaining');
        const reset = response.headers.get('X-RateLimit-Reset');

        if (remaining && parseInt(remaining) < 5) {
            logger.warn('Lyrics', `LRCLIB RateLimit is running low: ${remaining} left. Resets at timestamp: ${reset}`);
        }

        if (response.status === 429) {
            logger.warn('Lyrics', `LRCLIB Rate Limited! Reset at ${reset}`);
            return { error: 'RATE_LIMIT', reset };
        }

        if (!response.ok) {
            logger.warn('Lyrics', `LRCLIB API returned ${response.status}`);
            return null;
        }

        const data = await response.json();
        
        // Return the first match that has synced lyrics if possible, or just the best match
        if (data && data.length > 0) {
            const withSynced = data.find(track => track.syncedLyrics);
            return withSynced || data[0];
        }

        return null;
    } catch (error) {
        logger.error('Lyrics', 'Failed to fetch lyrics:', error);
        return null;
    }
}

/**
 * Parse LRC string into an array of lines with timestamps
 * @param {string} lrcString 
 * @returns {Array<{ timeMs: number, text: string }>}
 */
function parseLRC(lrcString) {
    if (!lrcString) return [];
    
    const lines = lrcString.split('\n');
    const parsed = [];
    
    // Regex to match [mm:ss.xx] or [mm:ss.xxx]
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const msString = match[3].length === 2 ? match[3] + '0' : match[3];
            const milliseconds = parseInt(msString, 10);
            
            const timeMs = (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
            const text = line.replace(timeRegex, '').trim();
            
            parsed.push({ timeMs, text: text || '♪' });
        }
    }
    
    // Sort by time just in case
    return parsed.sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * Get active lyric index based on current position
 * @param {Array<{ timeMs: number, text: string }>} parsedLyrics 
 * @param {number} positionMs 
 * @returns {number} Index of the active lyric line
 */
function getActiveLyricIndex(parsedLyrics, positionMs) {
    if (!parsedLyrics || parsedLyrics.length === 0) return -1;
    
    // Find the last line whose timestamp is <= current position
    for (let i = parsedLyrics.length - 1; i >= 0; i--) {
        if (positionMs >= parsedLyrics[i].timeMs) {
            return i;
        }
    }
    
    return -1; // Before the first lyric
}

module.exports = {
    fetchLyrics,
    parseLRC,
    getActiveLyricIndex
};
