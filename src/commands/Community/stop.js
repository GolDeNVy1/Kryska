const { SlashCommandBuilder, EmbedBuilder, ActivityType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Заканчиваю свой концерт"),
    async execute(interaction, client) {
        await interaction.deferReply();

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);

        if (!interaction.member.voice.channel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("Не вижу тебя, где ты?");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        if (!player) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("Играть нечего!");
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        try {
            const lastMessage = player.data.get("message");
            if (lastMessage) {
                try {
                    await lastMessage.delete();
                } catch (error) {
                    console.error('Ошибка при удалении сообщения "Now Playing":', error);
                }
                player.data.delete("message");
            }

            await player.destroy();

            const successEmbed = new EmbedBuilder()
                .setColor(0xA020F0)
                .setTitle("Концерт окончен")
                .setDescription(`Ладно, с вас хватит, <@${interaction.user.id}>, ещё увидимся 😉`)
                .setFooter({ 
                    text: `Запустил: ${interaction.user.displayName}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
            await interaction.followUp({ embeds: [successEmbed] });
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("Ошибка")
                .setDescription("У меня сломалась балалайка, подожди немного и попробуй снова.");
            await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            console.error(error);
        } await pickPresence();
    

        async function pickPresence () {
            try {
                await client.user.setPresence({
                    activities: [
                        {
                            name: "Ем сыр 🧀",
                            type: ActivityType.Custom,
                        },
                    ],
                    status: 'idle',
                })
            } catch (error) {
                console.error(error);
            }
        }
    }
};


