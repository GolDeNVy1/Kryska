const { Events } = require('kazagumo');

module.exports = {
name: Events.PlayerEnd,
async execute(client, player, track) {
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
    }
};