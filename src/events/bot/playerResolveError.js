const { EmbedBuilder, TextChannel, VoiceChannel } = require('discord.js');
const { Events } = require('discord.js');

module.exports = {
    name: Events.PlayerResolveError,
    async execute(player, track, err) {

module.exports = (kazagumo, client) => {
    kazagumo.on('playerResolveError', (player, track, error) => {
        console.error(`Resolve error for track ${track.title} in guild ${player.guildId}: ${error}`);

        const textChannel = client.channels.cache.get(player.textId);
        if (textChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌Ошибка при обработке трека')
                .setDescription(`Не удалось загрузить трек: **${track.title}**.\nОшибка: \`${error}\``);
            
            textChannel.send({ embeds: [errorEmbed] });
        }
    });
}}};
