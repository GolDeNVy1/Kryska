const { EmbedBuilder } = require('discord.js');
const { Events } = require('kazagumo');

module.exports = {
    name: Events.PlayerResolveError,
    async execute(client, player, track, err) {
        console.error(`Resolve error for track ${track.title} in guild ${player.guildId}: ${error}`);

        const textChannel = client.channels.cache.get(player.textId);
        if (textChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ Ошибка при обработке трека')
                .setDescription(`Не удалось загрузить трек: **${track.title}**.\nОшибка: \`${error}\``);
            
            textChannel.send({ embeds: [errorEmbed] });
        }
    }};


