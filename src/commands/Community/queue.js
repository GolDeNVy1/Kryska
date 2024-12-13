const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Показывает мой репертуар (следующие 30 песен)'),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.followUp({ content: 'Не вижу тебя, где ты?', ephemeral: true });

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        if (!player) return interaction.followUp({ content: 'Играть нечего!', ephemeral: true });

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) return interaction.followUp({ content: 'Я сейчас в другой компании!', ephemeral: true });

        const tracks = player.queue.slice(0, 30);
        const embed = new EmbedBuilder()
            .setColor(0xff6347)
            .setTitle('🎶 Мой репертуар на сегодня')
            .setThumbnail(player.queue.current.thumbnail || null)
            .setDescription(`**Сейчас играю:**\n[${player.queue.current.title}](${player.queue.current.uri})\n\n**Буду играть следующим:**`)
            .setFooter({ text: `Песен в очереди: ${player.queue.length}\nЗапустил: <@${track.requester.id}>`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true }) });

        if (tracks.length === 0) {
            embed.addFields({ name: 'Очередь пуста', value: 'Добавьте новые песни!' });
        } else {
            const trackList = tracks.map((track, index) => {
                const trackTitle = track.title.length > 20 
                    ? `${track.title.substring(0, 20)}...` 
                    : track.title;
                return `\`${index + 1}.\` [${trackTitle}](${track.uri}) - ${track.author}: ${track.requester}`;
            });

            let trackString = trackList.join('\n');
            let trackChunks = [];
            let currentChunk = '';

            trackString.split('\n').forEach(line => {
                if ((currentChunk + line + '\n').length <= 1024) {
                    currentChunk += line + '\n';
                } else {
                    trackChunks.push(currentChunk);
                    currentChunk = line + '\n';
                }
            });

            if (currentChunk) {
                trackChunks.push(currentChunk);
            }

            trackChunks.forEach((chunk, index) => {
                embed.addFields({
                    name: `‎`,
                    value: chunk,
                });
            });
        }

        return await interaction.followUp({ embeds: [embed]});
    }
};
