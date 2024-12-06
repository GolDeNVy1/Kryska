const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pauseresu')
        .setDescription('Остановлюсь и продолжу когда захочешь'),
    async execute(interaction, client) {
        await interaction.deferReply();

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.followUp({ content: 'Не вижу тебя, где ты?' });
        }

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);
        if (!player) {
            return interaction.followUp({ content: 'Играть нечего!' });
        }

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) {
            return interaction.followUp({ content: 'Я сейчас в другой компании!' });
        }

        try {
            if (!player.data.get("message")) return interaction.editReply({ content: 'Эмбед не найден, не могу обновить состояние.', ephemeral: true });
                
            const message = player.data.get("message");
            const embed = EmbedBuilder.from(message.embeds[0]);

            if (player.paused) {
                player.pause(false);
                await interaction.editReply({ content: `<@${interaction.user.id}> ▶️ Продолжаем! ` });
            } else {
                player.pause(true);
                embed.setAuthor({ name: '⏸️ Пауза' });
                await interaction.editReply({ content: `<@${interaction.user.id}> ⏸️ Пауза!` });
            }

            /* if (player.paused === true) {
                await player.pause(false);
                return interaction.followUp({ content: 'Окей, продолжаю.' });
            } else {
                await player.pause(true);
                return interaction.followUp({ content: 'Окей, подожду тебя.' });
            }*/
            // Обновляем сообщение с эмбедами
            await message.edit({ embeds: [embed] });

        } catch (error) {
            await interaction.followUp("У меня сломалась балалайка, подожди немного и покажи мне опять то, что ты хочешь чтобы я сыграла.");
            console.error(error);
        }
    }
}
