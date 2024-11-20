const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Пропускаю твою нелюбимую песню')
        .addIntegerOption(option =>
            option.setName('index')
                .setDescription('Индекс трека для пропуска')
                .setRequired(false)
        )
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply();

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.followUp({ content: 'Не вижу тебя, где ты?' });

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        if (!player) return interaction.followUp({ content: 'Играть нечего!' });

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) return interaction.followUp({ content: 'Я в другой компании сейчас!' });

        const index = interaction.options.getInteger('index');

        try {
            if (index === null) {
                const currentTrack = player.queue.current;
                const skippedTrackTitle = currentTrack ? currentTrack.title : 'Неизвестная песня';
                await player.skip();
                await interaction.followUp({ content: `Пропустили: **${skippedTrackTitle}**! Теперь следующая.` });
            } else {
                if (index < 1 || index > player.queue.size) {
                    return interaction.followUp({ content: `Указанный индекс должен быть от 1 до ${player.queue.size}.` });
                }
            
                const skippedToTrack = player.queue.at(index - 1);
                const skippedToTrackTitle = skippedToTrack ? skippedToTrack.title : 'Неизвестная песня';
            
                player.queue.splice(0, index - 1);
                await player.skip();
            
                await interaction.followUp({ content: `Пропустили до: № \`${index}\`. **${skippedToTrackTitle}**!` });
            }
            
        } catch (error) {
            await interaction.followUp("У меня сломалась балалайка, подожди немного и покажи мне опять то, что ты хочешь чтобы я сыграла.");
            console.error(error);
        }
    }
};
