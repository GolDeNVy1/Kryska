const {
    Client,
    GatewayIntentBits,
    Collection,
    MessageFlags,
} = require('discord.js');

const fs = require('fs');
const path = require('path');
const { Connectors } = require('shoukaku');
const { Kazagumo } = require('kazagumo');
const logger = require('./utils/logger');
const { searchYoutube } = require('./utils/ytdlp');

require('dotenv').config();

// ─── Validate required env vars ───────────────────────────────────────────────
const requiredEnv = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        logger.error('Config', `Missing required environment variable: ${key}`);
        process.exit(1);
    }
}

// ─── Discord Client ───────────────────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

client.commands = new Collection();
// Track guild IDs where the bot is intentionally leaving (not kicked)
client.selfDisconnecting = new Set();

// ─── Silent Messages (SuppressNotifications) ──────────────────────────────────
// Patch discord.js prototypes so every outgoing message is sent without
// a notification ping, no matter where in the code it is sent.
(function patchSilentMessages() {
    const djs = require('discord.js');
    const SILENT = MessageFlags.SuppressNotifications;

    /** Inject the silent flag into any options object (or string) passed to discord.js. */
    function withSilent(options) {
        if (typeof options === 'string') {
            return { content: options, flags: SILENT };
        }
        if (options && typeof options === 'object') {
            // flags can be a number, bigint, or BitField — merge numerically
            const existing = Number(options.flags ?? 0);
            return { ...options, flags: existing | Number(SILENT) };
        }
        return { flags: SILENT };
    }

    // Classes that have .send() — discord.js v14 puts it on concrete channel classes, not BaseChannel
    const SEND_CLASSES = [
        'BaseGuildTextChannel', 'TextChannel', 'NewsChannel',
        'ThreadChannel', 'VoiceChannel', 'StageChannel', 'DMChannel',
    ];
    for (const name of SEND_CLASSES) {
        const Cls = djs[name];
        if (!Cls?.prototype?.send) continue;
        const orig = Cls.prototype.send;
        Cls.prototype.send = function (options) {
            return orig.call(this, withSilent(options));
        };
    }

    // Classes that have .reply() / .followUp() / .editReply()
    const INTERACTION_CLASSES = [
        'ChatInputCommandInteraction', 'ButtonInteraction',
        'CommandInteraction', 'MessageComponentInteraction',
        'StringSelectMenuInteraction', 'ModalSubmitInteraction',
    ];
    for (const name of INTERACTION_CLASSES) {
        const Cls = djs[name];
        if (!Cls?.prototype) continue;

        for (const method of ['reply', 'followUp', 'editReply']) {
            const orig = Cls.prototype[method];
            if (!orig) continue;
            Cls.prototype[method] = function (options) {
                return orig.call(this, withSilent(options));
            };
        }
    }

    logger.info('Boot', 'Silent messages patch applied (SuppressNotifications on all outgoing messages).');
}());

// ─── Lavalink Nodes ───────────────────────────────────────────────────────────
const Nodes = [
    {
        name: 'owo',
        url: `${process.env.LAVA_HOST || 'lavalink'}:${process.env.LAVA_PORT || '2333'}`,
        auth: process.env.LAVA_PASSWORD || 'youshallnotpass',
        secure: false,
    },
];

// ─── Kazagumo (Lavalink wrapper) ──────────────────────────────────────────────
// Monkeypatch Kazagumo to support Deezer as a search engine for resolving
const KazagumoInterfaces = require('kazagumo/dist/Modules/Interfaces');
KazagumoInterfaces.SourceIDs['deezer'] = 'dz';

const kazagumo = new Kazagumo(
    {
        defaultSearchEngine: 'deezer', // text search → dzsearch:; Spotify/Apple Music → trackResolver (Deezer → YouTube → SC)
        defaultSource: 'dzsearch:',    // Override hardcoded kazagumo array check that forces ytsearch
        defaultYoutubeThumbnail: 'mqdefault',
        send: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        },
        // Custom resolver: tries multiple strategies to handle transliterated artist names
        trackResolver: async function (options) {
            const title      = this.title      || '';
            const author     = this.author     || '';
            const length     = this.length     || 0;
            const sourceName = this.sourceName || '';

            // YouTube треки НЕ переразрешаем через Deezer/SoundCloud —
            // иначе бот подменяет трек чем-то похожим по названию.
            // Если YouTube-плагин не смог воспроизвести — пусть падает с ошибкой.
            if (sourceName === 'youtube') {
                logger.warn('Resolver', `Skipping resolver for YouTube track "${title}" — YouTube playback failed, not substituting.`);
                return false;
            }

            // IMPORTANT: Always resolve audio on 'owo' — the same node the player runs on.
            // getLeastUsedNode() could return a Public Node, which produces base64 encoded tracks
            // that owo cannot decode (different Lavalink instances have incompatible encodings).
            const node = this.kazagumo.shoukaku.nodes.get('owo');
            if (!node || node.state !== 1) {
                logger.warn('Resolver', 'owo node is not connected, cannot resolve');
                return false;
            }

            // Search order: 1) Deezer  2) YouTube (yt-dlp)  3) SoundCloud

            // ── 1. Deezer ────────────────────────────────────────────────────────
            const dzStrategies = [
                { query: `dzsearch:${author} - ${title}`, strict: false },
                { query: `dzsearch:${title}`,             strict: true  },
            ];

            for (const strat of dzStrategies) {
                try {
                    const identifier = strat.query;
                    const res = await node.rest.resolve(identifier);
                    logger.info('Resolver', `[${identifier.slice(0,40)}] loadType=${res?.loadType} count=${res?.data?.length ?? 0}`);
                    if (!res || res.loadType === 'empty' || res.loadType === 'error') continue;

                    const rawTracks = res.loadType === 'search' ? res.data : null;
                    if (!rawTracks?.length) continue;

                    let best = null;
                    if (strat.strict && length) {
                        best = rawTracks.find(t => Math.abs(t.info.length - length) <= 15000);
                    } else {
                        best = rawTracks[0];
                    }

                    if (best) {
                        this.track   = best.encoded;
                        this.realUri = best.info.uri;
                        this.length  = best.info.length;
                        logger.info('Resolver', `Resolved "${title}" via: dzsearch`);
                        return true;
                    }
                } catch (e) {
                    logger.warn('Resolver', `Strategy "${strat.query.slice(0,40)}" threw: ${e.message}`);
                }
            }

            // ── 2. YouTube (yt-dlp) ──────────────────────────────────────────────
            try {
                const query = author ? `${author} - ${title}` : title;
                logger.info('Resolver', `Deezer miss — trying YouTube (yt-dlp) for: "${query}"`);
                const ytResult = await searchYoutube(query);

                if (ytResult) {
                    // Check duration if length is known (allow ±15s diff)
                    if (!length || Math.abs(ytResult.duration - length) <= 15000) {
                        const res = await node.rest.resolve(ytResult.streamUrl);
                        if (res && res.loadType === 'track' && res.data) {
                            const rawTrack = res.data;
                            this.track     = rawTrack.encoded;
                            this.realUri   = ytResult.uri;
                            this.length    = ytResult.duration;
                            this.thumbnail = ytResult.thumbnail || this.thumbnail;
                            logger.info('Resolver', `Resolved "${title}" via: YouTube (yt-dlp)`);
                            return true;
                        }
                    } else {
                        logger.warn('Resolver', `YouTube duration mismatch: expected ${length}ms, got ${ytResult.duration}ms — falling through to SoundCloud`);
                    }
                }
            } catch (e) {
                logger.warn('Resolver', `YouTube strategy failed: ${e.message}`);
            }

            // ── 3. SoundCloud ────────────────────────────────────────────────────
            const scStrategies = [
                { query: `scsearch:${author} - ${title}`, strict: false },
                { query: `scsearch:${title}`,             strict: true  },
            ];

            for (const strat of scStrategies) {
                try {
                    const identifier = strat.query;
                    const res = await node.rest.resolve(identifier);
                    logger.info('Resolver', `[${identifier.slice(0,40)}] loadType=${res?.loadType} count=${res?.data?.length ?? 0}`);
                    if (!res || res.loadType === 'empty' || res.loadType === 'error') continue;

                    const rawTracks = res.loadType === 'search' ? res.data : null;
                    if (!rawTracks?.length) continue;

                    let best = null;
                    if (strat.strict && length) {
                        best = rawTracks.find(t => Math.abs(t.info.length - length) <= 15000);
                    } else {
                        best = rawTracks[0];
                    }

                    if (best) {
                        this.track   = best.encoded;
                        this.realUri = best.info.uri;
                        this.length  = best.info.length;
                        logger.info('Resolver', `Resolved "${title}" via: scsearch`);
                        return true;
                    }
                } catch (e) {
                    logger.warn('Resolver', `Strategy "${strat.query.slice(0,40)}" threw: ${e.message}`);
                }
            }

            logger.error('Resolver', `All strategies failed for "${author} - ${title}"`);
            return false;
        },

    },
    new Connectors.DiscordJS(client),
    Nodes,
    {
        reconnectTries: 50,
        reconnectInterval: 5,
        moveOnDisconnect: false,
        resume: true,
        resumeTimeout: 60,
        resumeByLibrary: true,
    },
);


// ─── Shoukaku Events ──────────────────────────────────────────────────────────
kazagumo.shoukaku.on('ready', (name) => logger.info('Lavalink', `${name}: Ready!`));
kazagumo.shoukaku.on('error', (name, error) => logger.error('Lavalink', `${name}: Error`, error));
kazagumo.shoukaku.on('close', (name, code, reason) => logger.warn('Lavalink', `${name}: Closed (code ${code}, reason: ${reason || 'none'})`));
kazagumo.shoukaku.on('disconnect', (name) => logger.warn('Lavalink', `${name}: Disconnected. Auto-reconnecting...`));
kazagumo.shoukaku.on('reconnecting', (name, reconnectsLeft, reconnectInterval) => {
    logger.info('Lavalink', `${name}: Reconnecting... (attempts left: ${reconnectsLeft}, interval: ${reconnectInterval}s)`);
});
kazagumo.shoukaku.on('restored', (name) => {
    logger.info('Lavalink', `${name}: Session restored successfully! ✅`);
});

if (process.env.LOG_LEVEL === 'DEBUG') {
    kazagumo.shoukaku.on('debug', (name, info) => logger.debug('Lavalink', `${name}: ${info}`));
}

// ─── Voice Recovery on Discord Reconnect ─────────────────────────────────────
// When the bot's internet drops and reconnects, the voice connection to Discord
// voice servers becomes stale. We need to force Discord to send fresh
// VOICE_SERVER_UPDATE events so Lavalink can re-establish audio streaming.
let isRefreshing = false;

async function refreshVoiceConnections(reason) {
    // Prevent double-triggering (shardResume + shardReady can both fire)
    if (isRefreshing) {
        logger.info('VoiceRecovery', `Skipping "${reason}" — already refreshing.`);
        return;
    }
    isRefreshing = true;

    try {
        const players = [...kazagumo.players.values()];
        if (players.length === 0) return;

        logger.info('VoiceRecovery', `${reason} — Refreshing voice connections for ${players.length} player(s)...`);

        // Wait for Discord gateway to stabilize
        await new Promise(r => setTimeout(r, 1500));

        for (const player of players) {
            try {
                const guild = client.guilds.cache.get(player.guildId);
                if (!guild || !player.voiceId) continue;

                const savedPosition = player.position || 0;
                const currentTrack = player.queue.current;
                const wasPlaying = player.playing;

                // Send OP 4 (Voice State Update) to force Discord to re-send
                // VOICE_STATE_UPDATE + VOICE_SERVER_UPDATE
                guild.shard.send({
                    op: 4,
                    d: {
                        guild_id: player.guildId,
                        channel_id: player.voiceId,
                        self_deaf: true,
                        self_mute: false,
                    },
                });

                logger.info('VoiceRecovery', `Sent voice reconnect for guild ${player.guildId} (track: "${currentTrack?.title || 'none'}", pos: ${savedPosition}ms)`);

                // Wait for voice connection to be fully re-established
                await new Promise(r => setTimeout(r, 2000));

                // If track was playing, seek to saved position to force re-buffer
                if (currentTrack && wasPlaying && savedPosition > 0) {
                    try {
                        await player.seek(savedPosition);
                        logger.info('VoiceRecovery', `Re-seeked player in guild ${player.guildId} to ${savedPosition}ms`);

                        // Watchdog: check if audio is still playing after 5 seconds
                        const guildId = player.guildId;
                        setTimeout(async () => {
                            try {
                                const p = kazagumo.players.get(guildId);
                                if (!p || !p.queue.current) return;

                                const posAfter = p.position || 0;
                                // If position hasn't advanced (or barely), audio isn't actually playing
                                if (Math.abs(posAfter - savedPosition) < 2000 && p.playing) {
                                    logger.warn('VoiceRecovery', `Watchdog: audio stalled in guild ${guildId} (pos: ${posAfter}ms). Re-sending voice update and re-seeking...`);

                                    // Re-send OP 4
                                    const g = client.guilds.cache.get(guildId);
                                    if (g) {
                                        g.shard.send({
                                            op: 4,
                                            d: {
                                                guild_id: guildId,
                                                channel_id: p.voiceId,
                                                self_deaf: true,
                                                self_mute: false,
                                            },
                                        });
                                    }

                                    // Wait and re-seek
                                    await new Promise(r => setTimeout(r, 2000));
                                    await p.seek(posAfter).catch(() => {});
                                    logger.info('VoiceRecovery', `Watchdog: re-seeked guild ${guildId} to ${posAfter}ms`);
                                } else {
                                    logger.info('VoiceRecovery', `Watchdog: audio OK in guild ${guildId} (pos: ${posAfter}ms)`);
                                }
                            } catch (err) {
                                logger.warn('VoiceRecovery', `Watchdog error:`, err.message);
                            }
                        }, 5000);
                    } catch (seekErr) {
                        logger.warn('VoiceRecovery', `Seek failed for guild ${player.guildId}, trying play():`, seekErr.message);
                        if (!player.playing && !player.paused) {
                            player.play().catch(() => {});
                        }
                    }
                } else if (currentTrack && !player.playing && !player.paused) {
                    player.play().catch(() => {});
                    logger.info('VoiceRecovery', `Restarted playback for guild ${player.guildId}`);
                }
            } catch (err) {
                logger.error('VoiceRecovery', `Failed to refresh voice for guild ${player.guildId}:`, err);
            }
        }
    } finally {
        // Release lock after a cooldown to prevent rapid re-triggers
        setTimeout(() => { isRefreshing = false; }, 10000);
    }
}

client.on('shardResume', (shardId) => {
    logger.info('Discord', `Shard ${shardId} resumed.`);
    refreshVoiceConnections(`Shard ${shardId} resumed`);
});

client.on('shardReady', (shardId, unavailableGuilds) => {
    // Only refresh on reconnect (not initial boot)
    if (kazagumo.players.size > 0) {
        logger.info('Discord', `Shard ${shardId} ready (reconnect). Refreshing voice...`);
        refreshVoiceConnections(`Shard ${shardId} reconnected`);
    }
});

// ─── Global Error Handling ────────────────────────────────────────────────────
process.on('unhandledRejection', (error) => {
    if (error?.status === 400 && error?.path?.includes('/v4/sessions/')) {
        logger.warn('Shoukaku', 'Ignoring 400 Bad Request on sendServerUpdate (normal after destroy).');
        return;
    }
    if (error?.status === 404 && error?.path?.includes('/v4/sessions/')) {
        logger.warn('Shoukaku', `Ignoring 404 Session not found (normal after reconnect): ${error.path}`);
        return;
    }
    // Race condition: multiple tracks fail simultaneously, first one destroys
    // the player, Kazagumo's internal play() for the second track hits this.
    if (error?.message?.includes('Player is already destroyed')) {
        logger.warn('Kazagumo', 'Ignoring "Player is already destroyed" (expected during session recovery).');
        return;
    }
    logger.error('UnhandledRejection', '', error);
});

process.on('uncaughtException', (error) => {
    logger.error('UncaughtException', '', error);
});

// ─── Kazagumo Event Loader ───────────────────────────────────────────────────
async function registerKazagumoEvents(kzg) {
    const eventDir = path.join(__dirname, 'events', 'bot');

    if (!fs.existsSync(eventDir)) {
        logger.error('KazagumoEvents', `Directory not found: ${eventDir}`);
        return;
    }

    const eventFiles = fs.readdirSync(eventDir).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        try {
            const eventPath = path.join(eventDir, file);
            const event = require(eventPath);

            if (event?.name && typeof event.execute === 'function') {
                kzg.on(event.name, async (...args) => {
                    try {
                        await event.execute(client, ...args);
                    } catch (eventError) {
                        logger.error('KazagumoEvents', `Error in ${event.name}:`, eventError);
                    }
                });
                logger.info('KazagumoEvents', `Registered: ${event.name}`);
            } else {
                logger.warn('KazagumoEvents', `Invalid structure in ${file}, skipping.`);
            }
        } catch (error) {
            logger.error('KazagumoEvents', `Failed to load ${file}:`, error);
        }
    }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
(async () => {
    // Load function modules (handleCommands, handleEvents)
    const functions = fs.readdirSync(path.join(__dirname, 'functions')).filter(file => file.endsWith('.js'));
    for (const file of functions) {
        const func = require(`./functions/${file}`);
        if (typeof func === 'function') {
            func(client);
        } else {
            logger.warn('Boot', `${file} does not export a function, skipping.`);
        }
    }

    // Load Discord events (only non-module files like ready.js, interactionCreate.js)
    const discordEventFiles = fs.readdirSync(path.join(__dirname, 'events', 'discord'))
        .filter(file => file.endsWith('.js') && file !== 'buttonInteraction.js');

    client.handleEvents(discordEventFiles, './src/events/discord/');

    // Load Kazagumo events
    await registerKazagumoEvents(kazagumo);

    // Load commands
    const commandFolders = fs.readdirSync(path.join(__dirname, 'commands'));
    client.handleCommands(commandFolders, './src/commands');

    // Attach kazagumo to client
    client.kazagumo = kazagumo;

    // Login
    await client.login(process.env.DISCORD_TOKEN);
    logger.info('Boot', 'Bot started successfully!');

    // ─── Periodic Node Stats Logging ─────────────────────────────────────────
    const STATE_LABELS = { 0: 'CONNECTING', 1: 'CONNECTED', 2: 'DISCONNECTING', 3: 'DISCONNECTED' };

    function formatBytes(b) {
        if (b === 0) return '0B';
        const k = 1024;
        const s = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return `${(b / Math.pow(k, i)).toFixed(0)}${s[i]}`;
    }

    setInterval(() => {
        for (const [name, node] of kazagumo.shoukaku.nodes) {
            const s = node.stats;
            const state = STATE_LABELS[node.state] || '?';
            const players = `${s?.playingPlayers ?? 0}/${s?.players ?? 0} playing`;
            const cpu = s?.cpu ? `CPU: ${(s.cpu.systemLoad * 100).toFixed(1)}%` : 'CPU: N/A';
            const mem = s?.memory ? `RAM: ${formatBytes(s.memory.used)}/${formatBytes(s.memory.reservable)}` : 'RAM: N/A';

            let audio = '';
            if (s?.frameStats) {
                const total = (s.frameStats.sent || 0) + (s.frameStats.deficit || 0) + (s.frameStats.nulled || 0);
                const quality = total > 0 ? ((s.frameStats.sent / total) * 100).toFixed(0) : '100';
                audio = `Audio: ${quality}%`;
            }

            logger.info('NodeStats', `${name} [${state}] | ${players} | ${cpu} | ${mem}${audio ? ` | ${audio}` : ''}`);
        }
    }, 10_000); // every 10 seconds
})();

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(signal) {
    logger.info('Shutdown', `Received ${signal}. Cleaning up...`);

    try {
        // Destroy all players
        for (const [guildId, player] of kazagumo.players) {
            try {
                client.selfDisconnecting.add(guildId);
                await player.destroy();
            } catch {}
        }

        // Disconnect from Discord
        client.destroy();
        logger.info('Shutdown', 'Cleanup complete. Goodbye!');
    } catch (error) {
        logger.error('Shutdown', 'Error during cleanup:', error);
    }

    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
