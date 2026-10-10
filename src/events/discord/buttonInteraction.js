const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getQueuePage } = require('../../utils/getQueuePage');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { getPlatformStyle, RAT_GIF } = require('../../constants/platforms');
const logger = require('../../utils/logger');

/**
 * Handle button interactions. Called from interactionCreate.js.
 * No longer registered as a separate event (was causing duplicate interactionCreate conflict).
 */
async function handleButton(interaction, client) {
    const kazagumo = client.kazagumo;
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
        return interaction.reply({ embeds: [errorEmbed('Не вижу тебя, где ты?', interaction.user)], ephemeral: true });
    }

    const player = kazagumo.players.get(interaction.guildId);
    if (!player) {
        return interaction.reply({ embeds: [errorEmbed('Играть нечего!', interaction.user)], ephemeral: true });
    }

    if (voiceChannel.id !== player.voiceId) {
        return interaction.reply({ embeds: [errorEmbed('Я в другой компании сейчас!', interaction.user)], ephemeral: true });
    }

    // Queue pagination — update in-place, no reply needed
    if (interaction.customId.startsWith('queue_page_')) {
        const page = parseInt(interaction.customId.split('_')[2]);
        const queueData = getQueuePage(player, page);
        return interaction.update(queueData);
    }

    switch (interaction.customId) {

        // ─── Тихие кнопки (без ephemeral ответа) ─────────────────────────────

        case 'pause_resume': {
            const message = player.data.get('message');
            try {
                // Determine original attachment:// URL
                const { icon } = getPlatformStyle(player.queue.current?.sourceName);

                if (player.paused) {
                    player.pause(false);
                    if (message) {
                        const embed = EmbedBuilder.from(message.embeds[0])
                            .setAuthor({ name: '🎸 Сейчас играю 🎸', iconURL: icon })
                            .setFooter({ text: message.embeds[0].footer.text, iconURL: `attachment://${RAT_GIF.name}` });
                        await message.edit({ embeds: [embed] }).catch(() => { });
                    }
                } else {
                    player.pause(true);
                    if (message) {
                        const embed = EmbedBuilder.from(message.embeds[0])
                            .setAuthor({ name: '⏸️ Пауза', iconURL: icon })
                            .setFooter({ text: message.embeds[0].footer.text, iconURL: `attachment://${RAT_GIF.name}` });
                        await message.edit({ embeds: [embed] }).catch(() => { });
                    }
                }
                await interaction.deferUpdate();
            } catch (error) {
                logger.error('Button', 'Pause/resume failed:', error);
                await interaction.reply({ embeds: [errorEmbed('Ошибка. Попробуй снова.', interaction.user)], ephemeral: true });
            }
            break;
        }

        case 'skip': {
            try {
                if (player.queue?.length || player.queue.current) {
                    await player.skip();
                } else {
                    return interaction.reply({ embeds: [errorEmbed('Репертуар пуст, нечего пропускать.', interaction.user)], ephemeral: true });
                }
                await interaction.deferUpdate();
            } catch (error) {
                logger.error('Button', 'Skip failed:', error);
                await interaction.reply({ embeds: [errorEmbed('Ошибка при пропуске трека.', interaction.user)], ephemeral: true });
            }
            break;
        }

        case 'previous': {
            try {
                const prev = player.getPrevious();
                if (prev) {
                    await player.play(player.getPrevious(true));
                    await interaction.deferUpdate();
                } else {
                    await interaction.reply({ embeds: [errorEmbed('Не помню, что было до этого.', interaction.user)], ephemeral: true });
                }
            } catch (error) {
                logger.error('Button', 'Previous failed:', error);
                await interaction.reply({ embeds: [errorEmbed('Ошибка при воспроизведении предыдущего трека.', interaction.user)], ephemeral: true });
            }
            break;
        }

        case 'back_5s': {
            try {
                const newPosition = Math.max(0, player.position - 5000);
                await player.seek(newPosition);
                await interaction.deferUpdate();
            } catch (error) {
                logger.error('Button', 'Back 5s failed:', error);
                await interaction.reply({ embeds: [errorEmbed('Ошибка при перемотке.', interaction.user)], ephemeral: true });
            }
            break;
        }

        case 'forward_5s': {
            try {
                const trackLength = player.queue.current?.length || 0;
                const newPosition = Math.min(trackLength, player.position + 5000);
                await player.seek(newPosition);
                await interaction.deferUpdate();
            } catch (error) {
                logger.error('Button', 'Forward 5s failed:', error);
                await interaction.reply({ embeds: [errorEmbed('Ошибка при перемотке.', interaction.user)], ephemeral: true });
            }
            break;
        }

        // ─── Repeat — меняет эмодзи кнопки ──────────────────────────────────

        case 'repeat': {
            // Новый порядок: Выкл -> Вся очередь -> Один трек -> Выкл
            const modes = { none: 'queue', queue: 'track', track: 'none' };
            // эмодзи кнопки по текущему режиму (то что будет ПОСЛЕ нажатия)
            const emojis = { track: '🔂', queue: '🔁', none: '🔁❌' };
            const newMode = modes[player.loop] || 'none';
            player.setLoop(newMode);

            try {
                // Берём текущие компоненты NOW PLAYING сообщения и обновляем кнопку
                const nowMsg = player.data.get('message');
                if (nowMsg && nowMsg.components?.length) {
                    const updatedRows = nowMsg.components.map(row => {
                        const newRow = new ActionRowBuilder();
                        const updatedButtons = row.components.map(btn => {
                            const rebuilt = ButtonBuilder.from(btn);
                            if (btn.customId === 'repeat') {
                                rebuilt.setLabel(emojis[newMode]);
                            }
                            return rebuilt;
                        });
                        newRow.addComponents(updatedButtons);
                        return newRow;
                    });
                    await nowMsg.edit({ components: updatedRows }).catch(() => { });
                }
                await interaction.deferUpdate();
            } catch (error) {
                logger.error('Button', 'Repeat failed:', error);
                await interaction.reply({ embeds: [errorEmbed('Ошибка при смене режима повторения.', interaction.user)], ephemeral: true });
            }
            break;
        }

        // ─── Кнопки с ephemeral ответом ──────────────────────────────────────

        case 'stop': {
            await interaction.deferReply({ ephemeral: true });
            try {
                const msg = player.data.get('message');
                if (msg) { try { await msg.delete(); } catch { } }
                player.data.delete('message');
                client.selfDisconnecting.add(interaction.guildId);
                await player.destroy();
                await interaction.followUp({ embeds: [successEmbed('⏹️ Остановлено', 'Позовёте, когда станет скучно.', interaction.user)], ephemeral: true });
            } catch (error) {
                if (error?.status === 400) {
                    try { await interaction.followUp({ embeds: [successEmbed('⏹️ Остановлено', 'Позовёте, когда станет скучно.', interaction.user)], ephemeral: true }); } catch { }
                    return;
                }
                logger.error('Button', 'Stop failed:', error);
                await interaction.followUp({ embeds: [errorEmbed('Ошибка при остановке.', interaction.user)], ephemeral: true });
            }
            break;
        }

        case 'shuffle': {
            await interaction.deferReply({ ephemeral: true });
            if (player.queue.length > 1) {
                player.queue.shuffle();
                await interaction.followUp({ embeds: [successEmbed('🔀 Перемешано!', 'Музыка теперь в случайном порядке.', interaction.user)], ephemeral: true });
            } else {
                await interaction.followUp({ embeds: [errorEmbed('Недостаточно треков для перемешивания.', interaction.user)], ephemeral: true });
            }
            break;
        }

        case 'clear_queue': {
            await interaction.deferReply({ ephemeral: true });
            if (player.queue.length > 0) {
                player.queue.clear();
                await interaction.followUp({ embeds: [successEmbed('🗑️ Репертуар очищен!', null, interaction.user)], ephemeral: true });
            } else {
                await interaction.followUp({ embeds: [errorEmbed('Репертуар уже пуст.', interaction.user)], ephemeral: true });
            }
            break;
        }

        case 'show_queue': {
            await interaction.deferReply({ ephemeral: true });
            const queueData = getQueuePage(player, 0);
            await interaction.followUp({ ...queueData, ephemeral: true });
            break;
        }

        default:
            await interaction.reply({ embeds: [errorEmbed('Неизвестная кнопка.', interaction.user)], ephemeral: true });
    }
}

// Export handleButton function (no longer a full event module)
module.exports = { handleButton };