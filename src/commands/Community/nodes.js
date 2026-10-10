const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embeds');
const logger = require('../../utils/logger');

// Shoukaku State enum
const STATE_NAMES = {
    0: '🔄 Подключается',
    1: '🟢 Подключена',
    2: '🟠 Отключается',
    3: '🔴 Отключена',
};

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}д`);
    if (hours > 0) parts.push(`${hours}ч`);
    if (minutes > 0) parts.push(`${minutes}м`);
    parts.push(`${secs}с`);
    return parts.join(' ');
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nodes')
        .setDescription('Показать статистику Lavalink нод')
        .setDMPermission(false),

    async execute(interaction, client) {
        await interaction.deferReply();

        const kazagumo = client.kazagumo;
        const nodes = kazagumo.shoukaku.nodes;

        if (nodes.size === 0) {
            return interaction.followUp({
                embeds: [
                    new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setDescription('❌ Нет подключённых Lavalink нод.')
                ],
            });
        }

        const embeds = [];

        for (const [name, node] of nodes) {
            const state = STATE_NAMES[node.state] || '❓ Неизвестно';
            const stats = node.stats;

            const embed = new EmbedBuilder()
                .setColor(node.state === 1 ? 0x00FF00 : node.state === 0 ? 0xFFA500 : 0xFF0000)
                .setTitle(`🎵 ${name}`)
                .addFields(
                    { name: '📡 Статус', value: state, inline: true },
                    { name: '🌐 Адрес', value: `\`${node.url || 'N/A'}\``, inline: true },
                    { name: '🔗 Плееры', value: `${stats?.players ?? 0} всего / ${stats?.playingPlayers ?? 0} играют`, inline: true },
                );

            // CPU stats
            if (stats?.cpu) {
                const systemLoad = (stats.cpu.systemLoad * 100).toFixed(1);
                const lavalinkLoad = (stats.cpu.lavalinkLoad * 100).toFixed(1);
                const cores = stats.cpu.cores;

                // Visual load bar
                const loadPercent = Math.min(Math.round(stats.cpu.systemLoad * 100), 100);
                const barLength = 10;
                const filled = Math.round((loadPercent / 100) * barLength);
                const loadBar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

                embed.addFields(
                    { name: '🖥️ CPU', value: `\`${cores}\` ядер`, inline: true },
                    { name: '⚡ Нагрузка (система)', value: `\`${loadBar}\` ${systemLoad}%`, inline: true },
                    { name: '⚡ Нагрузка (Lavalink)', value: `${lavalinkLoad}%`, inline: true },
                );
            }

            // Memory stats
            if (stats?.memory) {
                const used = formatBytes(stats.memory.used);
                const allocated = formatBytes(stats.memory.allocated);
                const reservable = formatBytes(stats.memory.reservable);

                // Memory usage bar
                const memPercent = Math.min(Math.round((stats.memory.used / stats.memory.reservable) * 100), 100);
                const memBarLength = 10;
                const memFilled = Math.round((memPercent / 100) * memBarLength);
                const memBar = '█'.repeat(memFilled) + '░'.repeat(memBarLength - memFilled);

                embed.addFields(
                    { name: '💾 RAM', value: `\`${memBar}\` ${used} / ${reservable}`, inline: false },
                );
            }

            // Uptime
            if (stats?.uptime) {
                embed.addFields(
                    { name: '⏱️ Аптайм', value: formatUptime(stats.uptime), inline: true },
                );
            }

            // Frame stats (audio quality indicator)
            if (stats?.frameStats) {
                const sent = stats.frameStats.sent || 0;
                const deficit = stats.frameStats.deficit || 0;
                const nulled = stats.frameStats.nulled || 0;
                const total = sent + deficit + nulled;
                const quality = total > 0 ? ((sent / total) * 100).toFixed(1) : '100.0';

                let qualityEmoji = '🟢';
                if (quality < 95) qualityEmoji = '🟡';
                if (quality < 80) qualityEmoji = '🔴';

                embed.addFields(
                    { name: `${qualityEmoji} Качество аудио`, value: `${quality}% (отправлено: ${sent}, потеряно: ${nulled + deficit})`, inline: true },
                );
            }

            // Kazagumo players on this node
            const playersOnNode = [...kazagumo.players.values()].filter(p => {
                try {
                    return p.shoukaku?.node?.name === name;
                } catch {
                    return false;
                }
            });

            if (playersOnNode.length > 0) {
                const playerList = playersOnNode.map(p => {
                    const guild = client.guilds.cache.get(p.guildId);
                    const guildName = guild?.name || p.guildId;
                    const track = p.queue.current?.title || 'Нет трека';
                    const status = p.playing ? '▶️' : p.paused ? '⏸️' : '⏹️';
                    return `${status} **${guildName}** — ${track}`;
                }).join('\n');

                embed.addFields(
                    { name: '🎶 Активные плееры', value: playerList.substring(0, 1024), inline: false },
                );
            }

            embed.setTimestamp();
            embeds.push(embed);
        }

        await interaction.followUp({ embeds });
    },
};
