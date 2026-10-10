const logger = require('../utils/logger');

module.exports = (client) => {
    client.handleEvents = async (eventFiles, path) => {
        for (const file of eventFiles) {
            const event = require(`../events/discord/${file}`);

            if (!event || typeof event.execute !== 'function') {
                logger.warn('Events', `Skipping ${file} — missing execute function.`);
                continue;
            }

            const handler = async (...args) => {
                try {
                    await event.execute(...args, client);
                } catch (error) {
                    logger.error('Events', `Error in event ${event.name}:`, error);
                }
            };

            if (event.once) {
                client.once(event.name, handler);
            } else {
                client.on(event.name, handler);
            }

            logger.debug('Events', `Registered Discord event: ${event.name} (once: ${!!event.once})`);
        }
    };
};
