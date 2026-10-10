/**
 * Command validation utilities.
 * Replaces ~15 lines of duplicated checks in every command file.
 */

const { errorEmbed } = require('./embeds');

/**
 * Validate that the user is in a voice channel, a player exists,
 * and they are in the same channel as the bot.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {object} [options]
 * @param {boolean} [options.requirePlayer=true] - Whether a player must exist
 * @returns {{ player: import('kazagumo').KazagumoPlayer|null, voiceChannel: import('discord.js').VoiceChannel }|null}
 *          Returns the validated context or null if validation failed (reply already sent).
 */
async function validateCommand(interaction, kazagumo, options = {}) {
    const { requirePlayer = true } = options;

    // Check voice channel
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
        await interaction.followUp({
            embeds: [errorEmbed('Не вижу тебя, где ты?', interaction.user)],
            ephemeral: true,
        });
        return null;
    }

    // Check player exists
    const player = kazagumo.players.get(interaction.guildId);
    if (requirePlayer && !player) {
        await interaction.followUp({
            embeds: [errorEmbed('Играть нечего!', interaction.user)],
            ephemeral: true,
        });
        return null;
    }

    // Check same voice channel
    if (player && voiceChannel.id !== player.voiceId) {
        await interaction.followUp({
            embeds: [errorEmbed('Я сейчас в другой компании!', interaction.user)],
            ephemeral: true,
        });
        return null;
    }

    return { player, voiceChannel };
}

module.exports = { validateCommand };
