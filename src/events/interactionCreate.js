const { Interaction } = require("discord.js");

// Слэш-команды
module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        const kazagumo = client.kazagumo;
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) return;

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.log(error);
                await interaction.followUp({
                    content: 'У меня сломалась балалайка, подожди немного пока мне её починят.',
                    ephemeral: true
                });
            }
        }

        // сохранение истории воспроизведения
        kazagumo.on('playerStart', (player) => {
            if (!player.previousTracks) {
                player.previousTracks = [];
            }
        });

        kazagumo.on('playerEnd', (player, track) => {
            if (!player.previousTracks) {
                player.previousTracks = []; 
            }
            player.previousTracks.push(track); 
            
        });

        // Логика для кнопок
        if (interaction.isButton()) {
            await interaction.deferReply({ ephemeral: true });
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) return interaction.followUp({ content: 'Не вижу тебя, где ты?', ephemeral: true });

            const kazagumo = client.kazagumo;
            const player = kazagumo.players.get(interaction.guildId);
            if (!player) return interaction.followUp({ content: 'Играть нечего!', ephemeral: true });

            const botVoiceChannel = player.voiceId;
            if (voiceChannel.id !== botVoiceChannel) return interaction.followUp({ content: 'Я в другой компании сейчас!', ephemeral: true });

            switch (interaction.customId) {

                case 'pause_resume':
                    if (player.paused) {
                        player.pause(false);
                        await interaction.editReply({ content: '▶️ Продолжаем!', ephemeral: true });
                    } else {
                        player.pause(true);
                        await interaction.editReply({ content: '⏸️ Пауза!', ephemeral: true });
                    }
                    break;

                case 'skip':
                    if (player && player.queue && player.queue.length) {
                        await player.skip();
                        await interaction.editReply({ content: '⏭ Пропущено!', ephemeral: true });
                    } else {
                        await interaction.editReply({ content: 'Репертуар пуст, нечего пропускать.', ephemeral: true });
                    }
                    break;

                case 'previous':
                       
                            
                    if (player.getPrevious()) {
                        await interaction.editReply({ content: `⏮ Вроде-бы был этот, да?: **${player.getPrevious().title}**`, ephemeral: true });
                        await player.play(player.getPrevious(true)); 
                    } else {
                        await interaction.editReply({ content: 'Извини, я не помню как он звучал, отправь ссылку заново!', ephemeral: true });
                    }
                        
                    break;
                    

                case 'stop':
                    const lastMessage = player.data.get("message");
                if (lastMessage) {
                    try {
                        await lastMessage.delete();
                    } catch (error) {
                        console.error('Error deleting "Now Playing" message:', error);
                    }
                    player.data.delete("message");
                }
                    player.destroy();
                        await interaction.editReply({ content: '⏹️ Ладно, позовёте когда будет скучно.', ephemeral: true });
                    break;

                case 'shuffle':
                    if (player.queue.length > 1) {
                        player.queue.shuffle();
                        await interaction.editReply({ content: '🔀 Репертуар перемешан!', ephemeral: true });
                    } else {
                        await interaction.editReply({ content: 'Недостаточно треков для перемешивания.', ephemeral: true });
                    }
                    break;

                case 'volume_down':
                    player.volume = Math.max(0, player.volume - 10);
                    await player.setVolume(player.volume);
                    await interaction.editReply({ content: `🔉 Громкость уменьшена: ${player.volume}%`, ephemeral: true });
                    break;

                case 'volume_up':
                    player.volume = Math.min(200, player.volume + 10);
                    await player.setVolume(player.volume);
                    await interaction.editReply({ content: `🔊 Громкость увеличена: ${player.volume}%`, ephemeral: true });
                    break;

                default:
                    await interaction.editReply({ content: 'Неизвестная кнопка.', ephemeral: true });
                    break;
            }
        }
    }
};


