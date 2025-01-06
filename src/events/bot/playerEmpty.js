const { EmbedBuilder, ActivityType } = require('discord.js');
const { Events } = require('kazagumo');

module.exports = {
    name: Events.PlayerEmpty,
    async execute(client, player) {
        let disconnectTimeout;

        const lastMessage = player.data.get("message");
        if (lastMessage && lastMessage.deletable) {
            try {
                await lastMessage.delete();
            } catch (error) {
                if (error.code === 10008) {
                    console.warn(`Сообщение с ID ${lastMessage.id} уже удалено.`);
                } else {
                    console.error('Ошибка при удалении сообщения "Now Playing":', error);
                }
            }

            player.data.delete("message");
        }

        if (!player.queue.length) {
            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setDescription('Репертуар закончился, если хочешь закажи ещё песенку).');

            const channel = client.channels.cache.get(player.textId);
            if (channel) await channel.send({ embeds: [embed] });

            if (player.data.has("disconnectTimeout")) {
                clearTimeout(player.data.get("disconnectTimeout"));
                player.data.delete("disconnectTimeout");
            }
            
            disconnectTimeout = setTimeout(async () => {
                if (!player.queue.length) {
                    await player.destroy();
            
                    const embed = new EmbedBuilder()
                        .setColor(0xff0000)
                        .setDescription('Я пойду, у меня ещё много дел, позовёте когда будет скучно без музыки ;)');
            
                    const textChannel = client.channels.cache.get(player.textId);
                    if (textChannel) await textChannel.send({ embeds: [embed] });
                }
            }, 60000);
            
            player.data.set("disconnectTimeout", disconnectTimeout);
            
        }
        await pickPresence();
    

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
}};