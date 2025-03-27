const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Перемешиваю свой репертуар'),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Не вижу тебя, где ты?");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        if (!player) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Играть нечего!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Я в другой компании сейчас!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            await player.queue.shuffle();
            const successEmbed = new EmbedBuilder()
                .setColor(0xA020F0)
                .setTitle("Репертуар перемешан!")
                .setDescription(`<@${interaction.user.id}> теперь можно наслаждаться музыкой в случайном порядке!`)
                .setFooter({ 
                    text: `Запустил: ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
            await interaction.followUp({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("У меня сломалась балалайка, подожди немного и попробуй снова.");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            console.error(error);
        }
    }
};
