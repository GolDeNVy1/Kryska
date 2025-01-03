const { Events } = require('kazagumo');

module.exports = {
    name: Events.PlayerEnd,
    async execute(client, player, track) {
    const lastMessage = player.data.get("message");
    if (lastMessage) {
        try {
            const fetchedMessage = await lastMessage.channel.messages.fetch(lastMessage.id).catch(() => null);
            if (!fetchedMessage) {
                console.warn(`Сообщение уже удалено или недоступно: ${lastMessage.id}`);
                player.data.delete("message");
                return;
            }

            await fetchedMessage.delete();
        } catch (error) {
            if (error.code === 10008) {
                console.warn(`Сообщение с ID ${lastMessage.id} уже удалено.`);
            } else {
                console.error('Ошибка при удалении сообщения "Now Playing":', error);
            }
        }

        player.data.delete("message");
    }}};