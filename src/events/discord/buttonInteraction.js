const { EmbedBuilder } = require('discord.js');


module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isButton()) return;
        await interaction.deferReply({ ephemeral: true });

        const kazagumo = client.kazagumo;

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Не вижу тебя, где ты?")
                .setFooter({
                    text: `Запустил: ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const player = kazagumo.players.get(interaction.guildId);
        if (!player) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Играть нечего!")
                .setFooter({
                    text: `Запустил: ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        const botVoiceChannel = player.voiceId;
        if (voiceChannel.id !== botVoiceChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle("❌ Ошибка")
                .setDescription("Я в другой компании сейчас!")
                .setFooter({
                    text: `Запустил: ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
            return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        }

        switch (interaction.customId) {
            case 'pause_resume': 
                if (!player.data.get("message")) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("❌ Ошибка")
                        .setDescription("Эмбед не найден, не могу обновить состояние.");
                    return interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
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
            
                        await interaction.followUp({ embeds: [continueEmbed], ephemeral: true });
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
            
                        await interaction.followUp({ embeds: [pauseEmbedReply], ephemeral: true });
                    }
            
                    await message.edit({ embeds: [pauseEmbed] });
                } catch (error) {
                    console.error(error);
            
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("❌ Ошибка")
                        .setDescription("У меня сломалась балалайка, подожди немного и попробуй снова.");
            
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                }
                break;

            case 'skip': 
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
            
                        await interaction.followUp({ embeds: [skipEmbed], ephemeral: true });
                    } else {
                        const emptyQueueEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("❌ Ошибка")
                            .setDescription("Репертуар пуст, нечего пропускать.");
            
                        await interaction.followUp({ embeds: [emptyQueueEmbed], ephemeral: true });
                    }
                } catch (error) {
                    console.error(error);
            
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("❌ Ошибка")
                        .setDescription("Произошла ошибка при попытке пропустить трек. Попробуйте ещё раз.");
            
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                }
                break;
            
            case 'previous': 
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
            
                        await interaction.followUp({ embeds: [previousTrackEmbed], ephemeral: true });
                    } else {
                        const noPreviousTrackEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("❌ Ошибка")
                            .setDescription("Извини, я не помню, что было до этого. Отправь ссылку заново!");
            
                        await interaction.followUp({ embeds: [noPreviousTrackEmbed], ephemeral: true });
                    }
                } catch (error) {
                    console.error(error);
            
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("❌ Ошибка")
                        .setDescription("Произошла ошибка при попытке воспроизвести предыдущий трек. Попробуйте ещё раз.");
            
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                }
                break;
            
            case 'stop': 
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
            
                    await interaction.followUp({ embeds: [stopEmbed], ephemeral: true });
                } catch (error) {
                    console.error(error);
            
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("Ошибка")
                        .setDescription("Произошла ошибка при попытке остановить воспроизведение. Попробуйте снова.");
            
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                }
                break;
            
            case 'shuffle': 
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
            
                        await interaction.followUp({ embeds: [shuffleEmbed], ephemeral: true });
                    } else {
                        const insufficientTracksEmbed = new EmbedBuilder()
                            .setColor(0xFF0000)
                            .setTitle("❌ Недостаточно треков")
                            .setDescription("Добавьте больше треков в репертуар, чтобы их можно было перемешать.");
                        await interaction.followUp({ embeds: [insufficientTracksEmbed], ephemeral: true });
                    }
                } catch (error) {
                    console.error(error);
            
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("❌Ошибка")
                        .setDescription("Произошла ошибка при попытке перемешать очередь. Попробуйте снова.");
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                }
                break;
            
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

                    await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
                } catch (error) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("❌ Ошибка")
                        .setDescription("Произошла ошибка при изменении громкости. Попробуй позже.")
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
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
            
                    await interaction.followUp({ embeds: [successEmbed], ephemeral: true });
                } catch (error) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("❌ Ошибка")
                        .setDescription("Произошла ошибка при изменении громкости. Попробуй позже.")
                    
                    await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
                    console.error(error);
                }
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
                    await interaction.followUp({ embeds: [clearQueueEmbed], ephemeral: true });
                } else {
                    const emptyQueueEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle("Репертуар уже пуст.")
                        .setFooter({
                            text: `Захотел: ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                        });
                    await interaction.followUp({ embeds: [emptyQueueEmbed], ephemeral: true });
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
                await interaction.followUp({ embeds: [repeatEmbed], ephemeral: true });
                break;

                case 'show_queue':
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
                            value: 'Добавьте новые песни!',
                        });
                    } else {
                        const trackList = tracks.map((track, index) => {
                            const trackTitle = track.title.length > 35
                                ? `${track.title.substring(0, 35)}...`
                                : track.title;
                            return `\`${index + 1}.\` [${trackTitle}](${track.uri}) - ${track.author}: ${track.requester}`;
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
                
                    await interaction.followUp({ embeds: [queueEmbed], ephemeral: true });
                    break;
                

            default:
                const defaultEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle("❌ Ошибка")
                    .setDescription("Неизвестная кнопка.")
                await interaction.followUp({ embeds: [defaultEmbed], ephemeral: true });
                break;
        }
    }
}