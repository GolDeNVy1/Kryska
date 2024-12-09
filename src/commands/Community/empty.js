const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('empty')
        .setDescription('Очищает очередь'),

    async execute(interaction, client) {
        await interaction.deferReply();

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);

        if (!interaction.member.voice.channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Не вижу тебя, где ты?");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        if (!player) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Играть нечего!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            player.queue.clear();

            const successEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("🗑️ Репертуар очищен")
                .setFooter({
                    text: `Захотел: ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                });

            await interaction.followUp({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("У меня сломалась балалайка. Попробуй снова позже.");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            console.error(error);
        }
    },
};
