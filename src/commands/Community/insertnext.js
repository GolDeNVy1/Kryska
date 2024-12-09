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
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Не вижу тебя, где ты?");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        if (!player) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Играть нечего!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Я сейчас в другой компании!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            const result = await kazagumo.search(query, { requester: member });
            if (!result || result.tracks.length === 0) {
                const noResultEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Ничего не найдено")
                    .setDescription("Попробуйте другую ссылку или запрос.");
                return interaction.followUp({ embeds: [noResultEmbed], ephemeral: true });
            }

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
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("❌ Ошибка")
                        .setDescription("У меня сломалась балалайка, попробуйте снова.");
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                }
            }
        };