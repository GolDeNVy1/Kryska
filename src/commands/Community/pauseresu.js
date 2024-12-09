const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pauseresu')
        .setDescription('Остановлюсь и продолжу когда захочешь'),

    async execute(interaction, client) {
        await interaction.deferReply();

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("Не вижу тебя, где ты?");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        if (!player) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("Играть нечего!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("Я сейчас в другой компании!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            const isPaused = player.paused;

            
            player.pause(!isPaused);

            
            const successEmbed = new EmbedBuilder()
                .setColor(0xA020F0)
                .setTitle(isPaused ? "▶️ Продолжаем!" : "⏸️ Пауза")
                .setDescription(isPaused 
                    ? `<@${interaction.user.id}> Окей, продолжаем!` 
                    : `<@${interaction.user.id}> Подождать тебя, да?`)
                .setFooter({
                    text: `Запустил: ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("У меня сломалась балалайка, подожди немного и попробуй снова.");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            console.error(error);
        }
    }
};
