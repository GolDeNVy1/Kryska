const { SlashCommandBuilder } = require('discord.js');

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
        if (!voiceChannel) return interaction.followUp({ content: 'Не вижу тебя, ты где?' });

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        if (!player) return interaction.followUp({ content: 'Играть нечего!' });

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) return interaction.followUp({ content: 'Я в другой компании сейчас!' });

        const volume = interaction.options.getInteger('volume');

        try {
            await player.setVolume(volume);
            await interaction.followUp({ content: `Громкость изменена до ${volume}` });
        } catch (error) {
            await interaction.followUp("У меня сломалась балалайка, подожди немного и покажи мне опять то, что ты хочешь чтобы я сыграла.");
            console.error(error);
        }
    }
}
