module.exports = (client, kazagumo) => {
    client.handleEvents = async (eventFiles, path) => {
        for (const file of eventFiles) {
            const event = require(`../events/discord/${file}`);
            
            // Проверка, что событие экспортируется корректно
            if (event && typeof event.execute === 'function') {
                if (event.once) {
                    client.once(event.name, async (...args) => {
                        try {
                            await event.execute(...args, client);
                        } catch (error) {
                            console.error(`Error executing once event ${event.name}:`, error);
                        }
                    });
                } else {
                    client.on(event.name, async (...args) => {
                        try {
                            await event.execute(...args, client);
                        } catch (error) {
                            console.error(`Error executing event ${event.name}:`, error);
                        }
                    });
                }
            } else {
                console.warn(`Event ${file} does not have the correct structure. Missing execute function.`);
            }
        }
    };

 /*   client.kazagumoEvents = async (kazagumoFiles, path) => {
        for (const file of kazagumoFiles) {
            const event = require(`../events/bot/${file}`);
            
            if (event && typeof event.execute === 'function') {
                if (event.once) {
                    kazagumo.on(event.id, async (...args) => {
                        try {
                            await event.execute(...args, client);
                        } catch (error) {
                            console.error(`Error executing Kazagumo once event ${event.id}:`, error);
                        }
                    });
                } else {
                    kazagumo.on(event.id, async (...args) => {
                        try {
                            await event.execute(...args, client);
                        } catch (error) {
                            console.error(`Error executing Kazagumo event ${event.id}:`, error);
                        }
                    });
                }
            } else {
                console.warn(`Kazagumo event ${file} does not have the correct structure. Missing execute function.`);
            }
        }
    };*/
};
