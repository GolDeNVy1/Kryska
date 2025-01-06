const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {

        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.log(error);
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Ошибка")
                    .setDescription("У меня сломалась балалайка, подожди немного пока мне её починят.")
                    .setFooter({
                        text: `Запустил: ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    });
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            }
        }

    }
};


