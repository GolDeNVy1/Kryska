const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Буду играть одно и то же (песню или даже всю очередь)')
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('Повторение треков и плейлистов')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'none' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' },
                )),
    async execute(interaction, client) {
        await interaction.deferReply();

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.followUp({ content: 'Не вижу тебя, где ты?' });

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        if (!player) return interaction.followUp({ content: 'Играть нечего!' });

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) return interaction.followUp({ content: 'Я сейчас в другой компании!' });

        let repeatMode = interaction.options.getString('mode');
        try {
            await player.setLoop(repeatMode);
            await interaction.followUp({ content: `<@${interaction.user.id}> Окей, повторяю ${repeatMode}` });
        } catch (error) {
            await interaction.followUp({ content: 'У меня сломалась балалайка, подожди немного и покажи мне опять то, что ты хочешь чтобы я сыграла.' });
            console.error(error);
        }
    }
}
