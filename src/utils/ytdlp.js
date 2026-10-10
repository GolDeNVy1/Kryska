const { execFile } = require('child_process');
const { promisify } = require('util');
const { existsSync } = require('fs');
const execFileAsync = promisify(execFile);
const logger = require('./logger');

// Prefer the locally-updated yt-dlp binary over the (potentially stale) system one.
// Update path: curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ~/.local/bin/yt-dlp && chmod +x ~/.local/bin/yt-dlp
const LOCAL_YTDLP = `${process.env.HOME}/.local/bin/yt-dlp`;
const YTDLP_BIN = existsSync(LOCAL_YTDLP) ? LOCAL_YTDLP : 'yt-dlp';

const YT_REGEX = /^(https?:\/\/)?(www\.|music\.|m\.)?(youtube\.com\/(watch\?.*v=|shorts\/|live\/|playlist\?)|youtu\.be\/)/;

/**
 * Returns true if the query is a YouTube URL.
 */
function isYoutubeUrl(query) {
    return YT_REGEX.test(query);
}

/**
 * Resolves a YouTube URL to direct audio stream URL + metadata using yt-dlp.
 * Returns null if failed.
 *
 * @param {string} url - YouTube video URL
 * @returns {Promise<{streamUrl: string, title: string, author: string, duration: number, thumbnail: string}|null>}
 */
async function resolveYoutube(url) {
    try {
        // Single call: dump JSON for best audio format
        // -f selects best audio-only stream (opus/webm preferred for Discord)
        const { stdout } = await execFileAsync(YTDLP_BIN, [
            '--no-playlist',
            '--no-warnings',
            '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
            '-j',           // dump info JSON (does NOT download)
            url,
        ], { timeout: 30000 });

        const info = JSON.parse(stdout);

        // The selected format URL is in info.url for simple formats
        const streamUrl = info.url;

        if (!streamUrl) {
            logger.warn('yt-dlp', `No stream URL in JSON for ${url}`);
            return null;
        }

        const uri = info.webpage_url || url;
        let finalThumbnail = info.thumbnail || null;
        
        // Force YouTube hqdefault.jpg to avoid .webp or missing maxres issues in Discord
        const ytIdMatch = uri.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        if (ytIdMatch && ytIdMatch[1]) {
            finalThumbnail = `https://img.youtube.com/vi/${ytIdMatch[1]}/hqdefault.jpg`;
        }

        return {
            streamUrl,
            title:     info.title            || 'Unknown',
            author:    info.uploader || info.channel || 'Unknown',
            duration:  Math.round((info.duration || 0) * 1000), // ms
            thumbnail: finalThumbnail,
            uri:       uri,
        };
    } catch (err) {
        logger.error('yt-dlp', `Failed to resolve ${url}: ${err.message}`);
        return null;
    }
}

/**
 * Searches YouTube for a query using yt-dlp.
 * Returns the best match metadata.
 *
 * @param {string} query - The search query (e.g. "Rick Astley Never Gonna Give You Up")
 * @returns {Promise<{streamUrl: string, title: string, author: string, duration: number, thumbnail: string, uri: string}|null>}
 */
async function searchYoutube(query) {
    return resolveYoutube(`ytsearch1:${query}`);
}

module.exports = { isYoutubeUrl, resolveYoutube, searchYoutube };
