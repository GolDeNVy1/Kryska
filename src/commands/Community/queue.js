const { SlashCommandBuilder } = require('discord.js');
const { getQueuePage } = require('../../functions/getQueuePage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Показывает весь мой репертуар с перелистыванием'),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.followUp({ content: 'Не вижу тебя, где ты?', ephemeral: true });

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        if (!player) return interaction.followUp({ content: 'Играть нечего!', ephemeral: true });

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) return interaction.followUp({ content: 'Я сейчас в другой компании!', ephemeral: true });

        const queueData = getQueuePage(player, 0);
        return await interaction.followUp({ ...queueData, ephemeral: true });
    }
};
