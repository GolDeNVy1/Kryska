const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('previous')
        .setDescription('Возвращаюсь к предыдущему треку')
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("Не вижу тебя, где ты?");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        if (!player) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("Нет активного плеера!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("Я в другой компании сейчас!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            const previousTrack = player.getPrevious();
            if (previousTrack) {
                await player.play(player.getPrevious(true));
    
                const previousTrackEmbed = new EmbedBuilder()
                    .setColor(0xA020F0)
                    .setTitle("⏮ Воспроизведение предыдущего трека")
                    .setDescription(`Теперь играет: **${previousTrack.title}**`)
                    .setFooter({
                        text: `Запросил: ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                    });
    
                await interaction.followUp({ embeds: [previousTrackEmbed] });
            } else {
                const noPreviousTrackEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Ошибка")
                    .setDescription("Извини, я не помню, что было до этого. Отправь ссылку заново!");
    
                await interaction.followUp({ embeds: [noPreviousTrackEmbed], ephemeral: true });
            }
        } catch (error) {
            console.error(error);
    
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Произошла ошибка при попытке воспроизвести предыдущий трек. Попробуйте ещё раз.");
    
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }
    }
};
