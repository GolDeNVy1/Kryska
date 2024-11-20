const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Перемешиваю свой репертуар'),

    async execute(interaction, client) {
        await interaction.deferReply();

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.followUp({ content: 'Не вижу тебя, где ты?' });

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        if (!player) return interaction.followUp({ content: 'Играть нечего!' });

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) return interaction.followUp({ content: 'Я в другой компании сейчас!' });

        try {
            await player.queue.shuffle();
            await interaction.followUp({ content: 'Репертуар перемешан!' });
        } catch (error) {
            await interaction.followUp("У меня сломалась балалайка, подожди немного и покажи мне опять то, что ты хочешь чтобы я сыграла.");
            console.error(error);
        }
    }
}
