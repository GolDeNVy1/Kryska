const { EmbedBuilder } = require('discord.js');

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

                case 'pause_resume': {
                    if (!player.data.get("message")) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("❌ Ошибка")
                            .setDescription("Эмбед не найден, не могу обновить состояние.");
                        return interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                    }
                
                    const message = player.data.get("message");
                    const pauseEmbed = EmbedBuilder.from(message.embeds[0]);
                
                    try {
                        if (player.paused) {
                            player.pause(false);
                            pauseEmbed.setAuthor({ name: '🎸 Воспроизведение продолжается!' });
                
                            const continueEmbed = new EmbedBuilder()
                                .setColor(0xA020F0)
                                .setTitle("▶️ Продолжаем!")
                                .setDescription(`<@${interaction.user.id}> Окей, продолжаем!`)
                                .setFooter({
                                    text: `Обновлено: ${interaction.user.tag}`,
                                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                                });
                
                            await interaction.editReply({ embeds: [continueEmbed], ephemeral: true });
                        } else {
                            player.pause(true);
                            pauseEmbed.setAuthor({ name: '⏸️ Пауза' });
                
                            const pauseEmbedReply = new EmbedBuilder()
                                .setColor(0xA020F0)
                                .setTitle("⏸️ Пауза")
                                .setDescription(`<@${interaction.user.id}> Подождать тебя, да?`)
                                .setFooter({
                                    text: `Обновлено: ${interaction.user.tag}`,
                                    iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
                                });
                
                            await interaction.editReply({ embeds: [pauseEmbedReply], ephemeral: true });
                        }
                
                        await message.edit({ embeds: [pauseEmbed] });
                    } catch (error) {
                        console.error(error);
                
                        const errorEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("❌ Ошибка")
                            .setDescription("У меня сломалась балалайка, подожди немного и попробуй снова.");
                
                        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                    }
                    break;
                }
                

                case 'skip': {
                    try {
                        if (player && player.queue && player.queue.length) {
                            const skippedTrack = player.queue.current ? player.queue.current.title : 'Неизвестная песня';
                            await player.skip();
                
                            const skipEmbed = new EmbedBuilder()
                                .setColor(0xA020F0)
                                .setTitle("⏭ Пропущено!")
                                .setDescription(`Трек **${skippedTrack}** был пропущен.`)
                                .setFooter({
                                    text: `Пропустил: ${interaction.user.tag}`,
                                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                                });
                
                            await interaction.editReply({ embeds: [skipEmbed], ephemeral: true });
                        } else {
                            const emptyQueueEmbed = new EmbedBuilder()
                                .setColor(0xFF0000)
                                .setTitle("❌ Ошибка")
                                .setDescription("Репертуар пуст, нечего пропускать.");
                
                            await interaction.editReply({ embeds: [emptyQueueEmbed], ephemeral: true });
                        }
                    } catch (error) {
                        console.error(error);
                
                        const errorEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("❌ Ошибка")
                            .setDescription("Произошла ошибка при попытке пропустить трек. Попробуйте ещё раз.");
                
                        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                    }
                    break;
                }
                

                case 'previous': {
                    try {
                        const previousTrack = player.getPrevious();
                        if (previousTrack) {
                            await player.play(player.getPrevious(true));
                
                            const previousTrackEmbed = new EmbedBuilder()
                                .setColor(0xA020F0)
                                .setTitle("⏮ Воспроизведение предыдущего трека")
                                .setDescription(`Теперь играет: **${previousTrack.title}**`)
                                .setFooter({
                                    text: `Запросил: ${interaction.user.tag}`,
                                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                                });
                
                            await interaction.editReply({ embeds: [previousTrackEmbed], ephemeral: true });
                        } else {
                            const noPreviousTrackEmbed = new EmbedBuilder()
                                .setColor(0xFF0000)
                                .setTitle("❌ Ошибка")
                                .setDescription("Извини, я не помню, что было до этого. Отправь ссылку заново!");
                
                            await interaction.editReply({ embeds: [noPreviousTrackEmbed], ephemeral: true });
                        }
                    } catch (error) {
                        console.error(error);
                
                        const errorEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("❌ Ошибка")
                            .setDescription("Произошла ошибка при попытке воспроизвести предыдущий трек. Попробуйте ещё раз.");
                
                        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                    }
                    break;
                }
                


                case 'stop': {
                    try {
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
                
                        const stopEmbed = new EmbedBuilder()
                            .setColor(0xA020F0)
                            .setTitle("⏹️ Воспроизведение остановлено")
                            .setDescription("Позовёте, когда станет скучно.")
                            .setFooter({
                                text: `Остановил: ${interaction.user.tag}`,
                                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                            });
                
                        await interaction.editReply({ embeds: [stopEmbed], ephemeral: true });
                    } catch (error) {
                        console.error(error);
                
                        const errorEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("Ошибка")
                            .setDescription("Произошла ошибка при попытке остановить воспроизведение. Попробуйте снова.");
                
                        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                    }
                    break;
                }
                

                case 'shuffle': {
                    try {
                        if (player.queue.length > 1) {
                            player.queue.shuffle();
                
                            const shuffleEmbed = new EmbedBuilder()
                                .setColor(0xA020F0)
                                .setTitle("🔀 Репертуар перемешан!")
                                .setDescription("Теперь можно наслаждаться музыкой в случайном порядке.")
                                .setFooter({
                                    text: `Перемешал: ${interaction.user.tag}`,
                                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                                });
                
                            await interaction.editReply({ embeds: [shuffleEmbed], ephemeral: true });
                        } else {
                            const insufficientTracksEmbed = new EmbedBuilder()
                                .setColor(0xFF0000)
                                .setTitle("❌ Недостаточно треков")
                                .setDescription("Добавьте больше треков в репертуар, чтобы их можно было перемешать.");
                            await interaction.editReply({ embeds: [insufficientTracksEmbed], ephemeral: true });
                        }
                    } catch (error) {
                        console.error(error);
                
                        const errorEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("Ошибка")
                            .setDescription("Произошла ошибка при попытке перемешать очередь. Попробуйте снова.");
                        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                    }
                    break;
                }
                

                case 'volume_down':
                    try {
                        player.volume = Math.max(0, player.volume - 10);

                        await player.setVolume(player.volume);

                        const successEmbed = new EmbedBuilder()
                            .setColor(0x00FF00)
                            .setTitle("🔉 Громкость уменьшена")
                            .setDescription(`Теперь громкость: ${player.volume}%`)
                            .setFooter({
                                text: `Изменил: ${interaction.user.tag}`,
                                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                            });

                        await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
                    } catch (error) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("❌ Ошибка")
                            .setDescription("Произошла ошибка при изменении громкости. Попробуй позже.")
                        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                        console.error(error);
                    }
                    break;


                case 'volume_up':
                    try {
                        player.volume = Math.min(200, player.volume + 10);
                
                        await player.setVolume(player.volume);
                
                        const successEmbed = new EmbedBuilder()
                            .setColor(0x00FF00)
                            .setTitle("🔊 Громкость увеличена")
                            .setDescription(`Теперь громкость: ${player.volume}%`)
                            .setFooter({
                                text: `Изменил: ${interaction.user.tag}`,
                                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                            });
                
                        await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
                    } catch (error) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("❌ Ошибка")
                            .setDescription("Произошла ошибка при изменении громкости. Попробуй позже.")
                        
                        await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
                        console.error(error);
                    }
                    break;
                    

            default:
                    const defaultEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("❌ Ошибка")
                        .setDescription("Неизвестная кнопка.")
                    await interaction.editReply({ embeds: [defaultEmbed], ephemeral: true });
                    break;
                
                case 'clear_queue':
                    if (player.queue.length > 0) {
                        player.queue.clear();
                        const clearQueueEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("🗑️ Репертуар очищен!")
                            .setFooter({
                                text: `Захотел: ${interaction.user.tag}`,
                                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                            });
                        await interaction.editReply({ embeds: [clearQueueEmbed], ephemeral: true });
                    } else {
                        const emptyQueueEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("Репертуар уже пуст.")
                            .setFooter({
                                text: `Захотел: ${interaction.user.tag}`,
                                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                            });
                        await interaction.editReply({ embeds: [emptyQueueEmbed], ephemeral: true });
                    }
                    break;
                
                case 'repeat':
                    let repeatEmbed;
                    switch (player.loop) {
                        case 'none':
                            player.setLoop('track');
                            repeatEmbed = new EmbedBuilder()
                                .setColor(0x00FF00)
                                .setTitle("🔂 Повторяю одну песню.")
                                .setFooter({
                                    text: `Захотел: ${interaction.user.tag}`,
                                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                                });
                            break;
                        case 'track':
                            player.setLoop('queue');
                            repeatEmbed = new EmbedBuilder()
                                .setColor(0x00FF00)
                                .setTitle("🔁 Повторяю весь репертуар.")
                                .setFooter({
                                    text: `Захотел: ${interaction.user.tag}`,
                                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                                });
                            break;
                        case 'queue':
                            player.setLoop('none');
                            repeatEmbed = new EmbedBuilder()
                                .setColor(0xFF0000)
                                .setTitle("❌ Больше не повторяю.")
                                .setFooter({
                                    text: `Захотел: ${interaction.user.tag}`,
                                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                                });
                            break;
                    }
                    await interaction.editReply({ embeds: [repeatEmbed], ephemeral: true });
                    break;
                        
                    


                case 'show_queue':
                    if (!player) {
                        return interaction.editReply({ 
                            content: 'Играть нечего!', 
                            ephemeral: true 
                        });
                    }
                    const userMention = `<@${interaction.user.id}>`;
                    const tracks = player.queue.slice(0, 30);
                    const queueEmbed = new EmbedBuilder()
                        .setColor(0xff6347)
                        .setTitle('🎶 Мой репертуар на сегодня')
                        .setThumbnail(player.queue.current.thumbnail || null)
                        .setDescription(
                            `**Сейчас играю:**\n[${player.queue.current.title}](${player.queue.current.uri})\n\n**Буду играть следующим:**`
                        )
                        .setFooter({ text: `Песен в очереди: ${player.queue.length}` });

                    if (tracks.length === 0) {
                        queueEmbed.addFields({ 
                            name: 'Очередь пуста', 
                            value: 'Добавьте новые песни!' 
                        });
                    } else {
                        const trackList = tracks.map((track, index) => {
                            const trackTitle = track.title.length > 35 
                                ? `${track.title.substring(0, 35)}...` 
                                : track.title;
                            return `\`${index + 1}.\` [${trackTitle}](${track.uri}) - ${track.author}: ${userMention}`;
                        });

                        let trackChunks = [];
                        let currentChunk = '';

                        trackList.forEach(line => {
                            if ((currentChunk + line + '\n').length <= 1024) {
                                currentChunk += line + '\n';
                            } else {
                                trackChunks.push(currentChunk);
                                currentChunk = line + '\n';
                            }
                        });

                        if (currentChunk) {
                            trackChunks.push(currentChunk);
                        }

                        trackChunks.forEach((chunk, index) => {
                            queueEmbed.addFields({
                                name: index === 0 ? 'Очередь:' : '‎',
                                value: chunk,
                            });
                        });
                    }

                    return interaction.editReply({ 
                        embeds: [queueEmbed], 
                        ephemeral: true
                    });


            }
        }
    }
};


