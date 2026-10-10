const { ActivityType } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    name: 'ready',
    once: true,

    async execute(client) {
        logger.info('Ready', `Logged in as ${client.user.tag}!`);
        logger.info('Ready', `Serving ${client.guilds.cache.size} guild(s).`);

        try {
            await client.user.setPresence({
                activities: [{ name: 'Ем сыр 🧀', type: ActivityType.Custom }],
                status: 'idle',
            });
        } catch (error) {
            logger.error('Ready', 'Failed to set presence:', error);
        }

        // Initialize public nodes globally
        const { ensurePublicNodes } = require('../../utils/nodes');
        if (client.kazagumo) {
            ensurePublicNodes(client.kazagumo).catch(e => logger.error('Ready', 'Failed to connect public nodes at startup', e));
        }
    },
};
