const { EmbedBuilder } = require('discord.js');
const { Events } = require('kazagumo');

module.exports = {
    name: Events.PlayerError,
    async execute(client, player, track, err) {
        console.error(`Player error in guild ${player.guildId}: ${error}`);

        const textChannel = client.channels.cache.get(player.textId);
        if (textChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌Ошибка воспроизведения')
                .setDescription(`Произошла ошибка при воспроизведении в канале: **${player.guildId}**.\nОшибка: \`${error}\``)
                .setFooter({ text: 'Пожалуйста, обратитесь к администратору, если проблема не решится.' });

            textChannel.send({ embeds: [errorEmbed] });
        }
    }};
