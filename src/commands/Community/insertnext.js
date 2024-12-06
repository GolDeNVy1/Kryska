const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('insert')
        .setDescription('Добавлю песню сразу после этой')
        .addStringOption(option =>
            option
                .setName('song')
                .setDescription('Ссылка для песни')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const query = interaction.options.getString('song', true);

        const kazagumo = interaction.client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel) {
            return interaction.followUp({ content: 'Не вижу тебя, где ты?' });
        }

        if (!player) {
            return interaction.followUp({ content: 'Играть нечего!' });
        }

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) {
            return interaction.followUp({ content: 'Я в другой компании сейчас!' });
        }

        try {
            const result = await kazagumo.search(query, { requester: interaction.member });

            player.queue.unshift(...result.tracks);

            const loadingEmbed = new EmbedBuilder()
                .setColor(0xA020F0)
                .setTitle(result.type === "PLAYLIST"
                    ? `**Окей, следующее:** ${result.playlistName}.`
                    : `**Окей, следующее:** ${result.tracks[0].title}.`)
                .setFooter({ 
                    text: `Запустил: ${interaction.user.displayName}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
                    await interaction.followUp({ embeds: [loadingEmbed] });

                } catch (error) {
                    console.error(error);
                    await interaction.followUp({ content: 'У меня сломалась балалайка, подожди немного и покажи мне опять то, что ты хочешь чтобы я сыграла.' });
                }
            }
        };