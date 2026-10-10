const { REST, Routes } = require('discord.js');
const fs = require('fs');
const logger = require('../utils/logger');

require('dotenv').config();

const clientId = process.env.DISCORD_CLIENT_ID;

module.exports = (client) => {
    client.handleCommands = async (commandFolders, path) => {
        client.commandArray = [];

        for (const folder of commandFolders) {
            const commandFiles = fs.readdirSync(`${path}/${folder}`).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const command = require(`../commands/${folder}/${file}`);
                client.commands.set(command.data.name, command);
                client.commandArray.push(command.data.toJSON());
                logger.debug('Commands', `Loaded command: ${command.data.name}`);
            }
        }

        const rest = new REST().setToken(process.env.DISCORD_TOKEN);

        try {
            logger.info('Commands', `Refreshing ${client.commandArray.length} application (/) commands...`);

            await rest.put(
                Routes.applicationCommands(clientId),
                { body: client.commandArray },
            );

            logger.info('Commands', 'Successfully reloaded application (/) commands.');
        } catch (error) {
            logger.error('Commands', 'Failed to register slash commands:', error);
        }
    };
};
