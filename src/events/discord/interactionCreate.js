const { errorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {
        // Handle slash commands
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                logger.error('InteractionCreate', `Command "${interaction.commandName}" failed:`, error);

                const embed = errorEmbed(
                    'У меня сломалась балалайка, подожди немного пока мне её починят.',
                    interaction.user,
                );

                try {
                    if (interaction.deferred || interaction.replied) {
                        await interaction.followUp({ embeds: [embed], ephemeral: true });
                    } else {
                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                } catch {
                    // Unable to respond — interaction may have expired
                }
            }
            return;
        }

        // Handle button interactions
        if (interaction.isButton()) {
            try {
                const buttonHandler = require('./buttonInteraction');
                await buttonHandler.handleButton(interaction, client);
            } catch (error) {
                logger.error('InteractionCreate', `Button "${interaction.customId}" failed:`, error);
            }
        }
    },
};
