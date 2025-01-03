const { EmbedBuilder, ActivityType } = require('discord.js');
const { Kazagumo } = require("kazagumo");
const { Events } = require('kazagumo');

module.exports = {
    name: Events.PlayerEmpty,
    async execute(client, player) {
        let disconnectTimeout;

            const lastMessage = player.data.get("message");
            if (lastMessage) {
                try {
                    const fetchedMessage = await lastMessage.channel.messages.fetch(lastMessage.id).catch(() => null);
                    if (fetchedMessage) {
                        await fetchedMessage.delete();
                    }
                } catch (error) {
                    console.error('Ошибка при удалении сообщения:', error);
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