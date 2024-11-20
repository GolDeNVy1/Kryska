const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play-ext')
        .setDescription('Усовершенствованная комманда на воспроизведение')
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
        async execute(interaction, client){
            await interaction.deferReply({ephemeral: false});
            const query = interaction.options.getString('url');
            let repeatmode = interaction.options.getString('source');

            const kazagumo = client.kazagumo

            const voice_channel = interaction.member.voice.channel;
            if (!voice_channel) return interaction.followUp({ content: 'Не вижу тебя, где ты?'});

            let player = await kazagumo.createPlayer({
                guildId: interaction.guild.id,
                textId: interaction.channel.id,
                voiceId: voice_channel.id,
                volume: 100,
                deaf: true,
            })

            const bot_voice_channel = player.voiceId
            if (voice_channel != bot_voice_channel) return interaction.followUp({ content: `Я в другом канале!`})

                let result = await kazagumo.search(query, { requester: interaction.member.user });

            if (!result.tracks.length) return interaction.followUp("Извини, я не знаю как это играть :'(.");

            if (result.type === "PLAYLIST") for (let track of result.tracks) player.queue.add(track);
            else await player.queue.add(result.tracks[0]);

            if (!player.playing && !player.paused) player.play();
            if (result.type === "PLAYLIST"){
                const loadingEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setDescription(`**Добавлено в очередь: **${result.playlistName}`)
                await interaction.followUp({ embeds: [loadingEmbed]});
            }
            else{
                const loadingEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setDescription(`**Добавлено в очередь: ** ${result.tracks[0].title}`)
                await interaction.followUp({ embeds: [loadingEmbed]});
            }
        }
}
