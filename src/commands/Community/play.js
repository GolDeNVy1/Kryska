const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Начну играть музыку')
        .setDMPermission(false)
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription('Ссылка на музыку')
                .setRequired(true)),
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: false });
        const query = interaction.options.getString('url');

        const kazagumo = client.kazagumo;

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) return interaction.followUp({ content: 'Не вижу тебя, где ты?' });

        // Получаем или создаем player
        let player = kazagumo.players.get(interaction.guildId);
        if (!player) {
            player = await kazagumo.createPlayer({
                guildId: interaction.guild.id,
                textId: interaction.channel.id,
                voiceId: voiceChannel.id,
                volume: 100,
                deaf: true,
            });
        }

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) return interaction.followUp({ content: 'Я сейчас в другой компании!' });

        let result = await kazagumo.search(query, { requester: interaction.member.user });

        if (!result.tracks.length) return interaction.followUp("Прости, я не знаю как.");

        if (result.type === "PLAYLIST") {
            for (let track of result.tracks) {
                player.queue.add(track);
            }
        } else {
            await player.queue.add(result.tracks[0]);
        }

        if (!player.playing && !player.paused) {
            player.play();
        }

        const loadingEmbed = {
            color: 0x3498db,
            description: result.type === "PLAYLIST" 
                ? `**Добавлено в очередь:** ${result.playlistName} с \`${player.queue.length}\` Треками` 
                : `**Добавлено в очередь:** ${result.tracks[0].title}`
        };
        await interaction.followUp({ embeds: [loadingEmbed] });
    }
};
