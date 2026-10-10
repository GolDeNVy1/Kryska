/**
 * Platform icons and colors for the "Now Playing" embed.
 *
 * Uses local GIF files from src/media/ as Discord attachments.
 * Referenced in embeds via attachment://filename.gif
 */

const path = require('path');

const MEDIA_DIR = path.join(__dirname, '..', 'media');

// Local GIF files for platform icons
const PLATFORM_FILES = {
    youtube:    { path: path.join(MEDIA_DIR, 'youtube.gif'),    name: 'youtube.gif' },
    spotify:    { path: path.join(MEDIA_DIR, 'spotify.gif'),    name: 'spotify.gif' },
    soundcloud: { path: path.join(MEDIA_DIR, 'soundcloud.gif'), name: 'soundcloud.gif' },
    applemusic: { path: path.join(MEDIA_DIR, 'apple.gif'),      name: 'apple.gif' },
    'apple music': { path: path.join(MEDIA_DIR, 'apple.gif'),   name: 'apple.gif' },
    'apple-music': { path: path.join(MEDIA_DIR, 'apple.gif'),   name: 'apple.gif' },
    apple:      { path: path.join(MEDIA_DIR, 'apple.gif'),      name: 'apple.gif' },
    deezer:     { path: path.join(MEDIA_DIR, 'deezer.gif'),     name: 'deezer.gif' },
    youtube_music: { path: path.join(MEDIA_DIR, 'youtube.gif'), name: 'youtube.gif' },
    'youtube music': { path: path.join(MEDIA_DIR, 'youtube.gif'), name: 'youtube.gif' },
};

// Local GIF for kick message
const KICK_GIF = { path: path.join(MEDIA_DIR, 'за-что.gif'), name: 'za-chto.gif' };

// Local GIF for rat spinning
const RAT_GIF = { path: path.join(MEDIA_DIR, 'rat-spinning.gif'), name: 'rat-spinning.gif' };

const PLATFORM_COLORS = {
    youtube:    0xFF0000,
    spotify:    0x1DB954,
    soundcloud: 0xFF3300,
    applemusic: 0xFC3C44,
    'apple music': 0xFC3C44,
    'apple-music': 0xFC3C44,
    apple:      0xFC3C44,
    deezer:     0x5F0A87,
    jiosaavn:   0x008A78,
    youtube_music: 0xFF0000,
    'youtube music': 0xFF0000,
    ytmsearch:  0xFF0000,
    ytsearch:   0xFF0000,
    scsearch:   0xFF3300,
    dzsearch:   0x5F0A87,
    default:    0xFFFF00,
};

/**
 * Get file info, attachment icon URL, and color for a source.
 * @param {string} sourceName
 * @returns {{ file: { path: string, name: string }|null, icon: string|null, color: number }}
 */
function getPlatformStyle(sourceName) {
    const file = PLATFORM_FILES[sourceName] || null;
    const color = PLATFORM_COLORS[sourceName] || PLATFORM_COLORS.default;
    const icon = file ? `attachment://${file.name}` : null;
    return { file, icon, color };
}

module.exports = {
    PLATFORM_FILES,
    PLATFORM_COLORS,
    KICK_GIF,
    RAT_GIF,
    getPlatformStyle,
};
