/**
 * Embed factory — creates consistent Discord embeds across the entire bot.
 * Eliminates 30+ duplicate EmbedBuilder constructions.
 */

const { EmbedBuilder } = require('discord.js');

const COLORS = {
    ERROR:   0xFF0000,
    SUCCESS: 0xA020F0,
    INFO:    0x3498DB,
    WARNING: 0xFFA500,
    QUEUE:   0xFF6347,
    WHITE:   0xFFFFFF,
    GREEN:   0x00FF00,
};

/**
 * Create a standardized error embed.
 * @param {string} description - Error description
 * @param {import('discord.js').User} [user] - User who triggered it
 * @returns {EmbedBuilder}
 */
function errorEmbed(description, user) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.ERROR)
        .setTitle('❌ Ошибка')
        .setDescription(description);

    if (user) {
        embed.setFooter({
            text: `Запустил: ${user.tag}`,
            iconURL: user.displayAvatarURL({ dynamic: true }),
        });
    }

    return embed;
}

/**
 * Create a standardized success embed.
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @param {import('discord.js').User} [user] - User who triggered it
 * @returns {EmbedBuilder}
 */
function successEmbed(title, description, user) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.SUCCESS)
        .setTitle(title)
        .setDescription(description);

    if (user) {
        embed.setFooter({
            text: `Запустил: ${user.displayName}`,
            iconURL: user.displayAvatarURL({ dynamic: true }),
        });
    }

    return embed;
}

/**
 * Create a standardized info embed.
 * @param {string} title - Embed title
 * @param {string} [description] - Optional description
 * @param {import('discord.js').User} [user] - User who triggered it
 * @returns {EmbedBuilder}
 */
function infoEmbed(title, description, user) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO);

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);

    if (user) {
        embed.setFooter({
            text: `Запустил: ${user.displayName}`,
            iconURL: user.displayAvatarURL({ dynamic: true }),
        });
    }

    return embed;
}

module.exports = {
    COLORS,
    errorEmbed,
    successEmbed,
    infoEmbed,
};
