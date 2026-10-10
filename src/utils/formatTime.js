/**
 * Format milliseconds to mm:ss display string.
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted time string (e.g., "3:45")
 */
function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

module.exports = { formatTime };
