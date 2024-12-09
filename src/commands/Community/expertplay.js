const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play-ext')
        .setDescription('Усовершенствованная команда на воспроизведение')
        .setDMPermission(false)
        .addStringOption(option =>
            option.setName('source')
                .setDescription('Выбери сервис')
                .setRequired(true)
                .addChoices(
                    { name: 'Youtube', value: 'youtube' },
                    { name: 'SoundCloud', value: 'soundcloud' },
                ))
        .addStringOption(option =>
            option
                .setName('url')
                .setDescription('Ссылка на музыку')
                .setRequired(true)),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: false });
        const query = interaction.options.getString('url');
        const repeatmode = interaction.options.getString('source');

        const kazagumo = client.kazagumo;
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Не вижу тебя, где ты?");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        let player;
        try {
            player = await kazagumo.createPlayer({
                guildId: interaction.guild.id,
                textId: interaction.channel.id,
                voiceId: voiceChannel.id,
                volume: 100,
                deaf: true,
            });
        } catch (error) {
            console.error("Ошибка создания плеера:", error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Не удалось подключиться к голосовому каналу.");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Я в другом канале!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        let result;
        try {
            result = await kazagumo.search(query, { requester: interaction.member.user });
        } catch (error) {
            console.error("Ошибка поиска треков:", error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Не удалось найти треки. Попробуйте снова.");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        if (!result.tracks.length) {
            const noTrackEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Извини, я не знаю, как это играть :'(.");
            return interaction.followUp({ embeds: [noTrackEmbed], ephemeral: true });
        }

        if (result.type === "PLAYLIST") {
            for (let track of result.tracks) player.queue.add(track);
        } else {
            player.queue.add(result.tracks[0]);
        }

        if (!player.playing && !player.paused) player.play();

        const loadingEmbed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle(result.type === "PLAYLIST"
                ? `**Добавлено в очередь: **${result.playlistName}`
                : `**Добавлено в очередь: ** ${result.tracks[0].title}`)
            .setFooter({
                text: `Захотел: ${interaction.user.displayName}`,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            });

        await interaction.followUp({ embeds: [loadingEmbed] });
    }
};
