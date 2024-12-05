const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Заканчиваю свой концерт"),
    async execute(interaction, client) {
        await interaction.deferReply();

        const kazagumo = client.kazagumo;
        const player = kazagumo.players.get(interaction.guildId);

        if (!interaction.member.voice.channel) {
            return interaction.followUp({ content: 'Не вижу тебя, где ты?' });
        }
        if (!player) {
            return interaction.followUp({ content: 'Играть нечего!' });
        }

       const userMention = `<@&{interaction.user.id}>`;

        try {
            const lastMessage = player.data.get("message");
            if (lastMessage) {
                try {
                    await lastMessage.delete();
                } catch (error) {
                    console.error('Error deleting "Now Playing" message:', error);
                }
                player.data.delete("message");
            }
            await player.destroy();
            await interaction.followUp({ content: `Ладно, с вас хватит, ${userMention}, ещё увидимся ;)` });
        } catch (error) {
            await interaction.followUp("У меня сломалась балалайка, подожди немного и покажи мне опять то, что ты хочешь чтобы я сыграла.");
            console.error(error);
        }
    }
}
