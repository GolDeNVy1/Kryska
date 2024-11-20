const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const voice = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('empty')
    .setDescription('Очищает очередь'),
    async execute(interaction, client) {
        await interaction.deferReply();

        kazagumo = client.kazagumo
        const player = kazagumo.players.get(interaction.guildId)

        if (!interaction.member.voice.channel) {
            return interaction.followUp({ content: 'Не вижу тебя, где ты?'});
        }
        if (!player) return interaction.followUp({ content: 'Играть нечего!'});

        try {
            await player.queue.clear();
            stopEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setDescription(`Репертуар очищен ${interaction.user.displayName}`)
            await interaction.followUp({ embeds: [stopEmbed]});
        } catch (error) {
            await interaction.followUp("У меня сломалась балалайка, подожди немного и покажи мне опять то, что ты хочешь чтобы я сыграла.");
            console.log(error);
        }
    }
}
