const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
        await interaction.deferReply({ ephermal: true });

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Не вижу тебя, где ты?");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
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
                .setDescription("Я в другой компании сейчас!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const index = interaction.options.getInteger('index');

        try {
            if (index === null) {
                const currentTrack = player.queue.current;
                const skippedTrackTitle = currentTrack ? currentTrack.title : 'Неизвестная песня';
                await player.skip();

                const successEmbed = new EmbedBuilder()
                    .setColor(0xA020F0)
                    .setTitle("Трек пропущен")
                    .setDescription(`<@${interaction.user.id}> пропустил(a): **${skippedTrackTitle}**! Теперь следующая.`)
                    .setFooter({ 
                        text: `Запустил: ${interaction.user.displayName}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    });
                await interaction.followUp({ embeds: [successEmbed] });
            } else {
                if (index < 1 || index > player.queue.size) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("❌ Ошибка")
                        .setDescription(`Указанный индекс должен быть от 1 до ${player.queue.size}.`);
                    return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                }

                const skippedToTrack = player.queue.at(index - 1);
                const skippedToTrackTitle = skippedToTrack ? skippedToTrack.title : 'Неизвестная песня';

                player.queue.splice(0, index - 1);
                await player.skip();

                const successEmbed = new EmbedBuilder()
                    .setColor(0xA020F0)
                    .setTitle("Трек пропущен")
                    .setDescription(`<@${interaction.user.id}> пропустил(a) до: № \`${index}\`. **${skippedToTrackTitle}**!`)
                    .setFooter({ 
                        text: `Запустил: ${interaction.user.displayName}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    });
                await interaction.followUp({ embeds: [successEmbed] });
            }
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("У меня сломалась балалайка, подожди немного и попробуй снова.");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            console.error(error);
        }
    }
};
