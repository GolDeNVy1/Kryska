const { ActivityType } = require('discord.js');
//статус для афк
module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log('Ready!');
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
    },
};
