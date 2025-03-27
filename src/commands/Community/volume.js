const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Играю громче или тише по твоему желанию')
        .addIntegerOption(option =>
            option
                .setName('volume')
                .setDescription('Желаемая громкость')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(200))
        .setDMPermission(false),
    async execute(interaction, client) {
        await interaction.deferReply();
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Не вижу тебя, ты где?");
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

        const volume = interaction.options.getInteger('volume');

        try {
            await player.setVolume(volume);
            const successEmbed = new EmbedBuilder()
                .setColor(0xA020F0)
                .setTitle("🔊Громкость изменена")
                .setDescription(`Громкость изменена до **${volume}**`)
                .setFooter({ 
                    text: `Запустил: ${interaction.user.displayName}`,
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
