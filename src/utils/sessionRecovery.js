const { EmbedBuilder, Status } = require('discord.js');
const logger = require('./logger');

/**
 * Centralized session recovery manager.
 * Prevents multiple concurrent recovery attempts for the same guild,
 * accumulates failed tracks, and retries with exponential backoff.
 */

// Map<guildId, { promise, failedTracks[] }>
const activeRecoveries = new Map();

// Map<guildId, timestamp> — cooldown after successful recovery
// Prevents stale errors from the old player's resolve queue from triggering a new recovery loop
const recoveryCooldowns = new Map();

// Map<nodeName, { count, lastSeen }> — track consecutive session failures per node
// When a node keeps producing "Session not found", it means the Lavalink session ID is stale
// and the node needs to be reconnected to get a fresh session.
const nodeSessionFailures = new Map();
const NODE_RECONNECT_THRESHOLD = 2; // After 2 consecutive session-not-found recoveries, reconnect the node
const NODE_FAILURE_WINDOW_MS = 120_000; // Reset counter if no failure for 2 minutes

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1500;

// ─── Shard readiness check ──────────────────────────────────────────────────
// Discord.js Status enum: 0 = READY, 5 = RESUMING, etc.
const SHARD_READY = 0;

/**
 * Wait until the Discord shard responsible for this guild is connected.
 * Prevents wasting recovery attempts while the gateway is still reconnecting.
 *
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {number} timeoutMs
 * @returns {Promise<boolean>} true if shard became ready, false if timed out
 */
async function waitForShard(client, guildId, timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            const shard = client.ws.shards.get(guild.shardId);
            if (shard && shard.status === SHARD_READY) {
                return true;
            }
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return false;
}

// ─── Node health scoring ────────────────────────────────────────────────────

/**
 * Score a Lavalink node by health. Higher = better.
 * Penalizes nodes with suspicious stats (0% CPU + nearly full RAM = likely broken).
 * @param {object} node - Shoukaku node
 * @returns {number} health score (higher is better)
 */
function scoreNode(node, isSpotify = false) {
    if (!node || node.state !== 1) return -1; // Not connected

    let score = 100;

    // ─── Node Priorities ────────────────────────────────────────────────
    // 'owo' (self-hosted) is ALWAYS preferred for the player.
    // Public nodes are only used to fetch Spotify metadata, never for playback.
    if (node.name === 'owo') {
        score += 1000; // Absolute priority — always play on own node
    }

    const s = node.stats;
    if (!s) return score; // No stats yet — return current score

    // Penalize: 0% CPU with very high RAM usage ratio → likely a zombie node
    if (s.cpu && s.memory) {
        const cpuLoad = s.cpu.systemLoad * 100;
        const ramRatio = s.memory.used / (s.memory.reservable || 1);
        if (cpuLoad < 0.1 && ramRatio > 0.7) {
            score -= 60; // Heavily penalize zombie nodes
            logger.debug('NodeHealth', `Node penalized (zombie pattern): CPU=${cpuLoad.toFixed(1)}%, RAM=${(ramRatio * 100).toFixed(0)}%`);
        }
    }

    // Penalize high player count (busy node)
    if (s.players > 500) score -= 10;
    if (s.players > 1000) score -= 20;

    // Penalize poor audio quality
    if (s.frameStats) {
        const total = (s.frameStats.sent || 0) + (s.frameStats.deficit || 0) + (s.frameStats.nulled || 0);
        if (total > 0) {
            const quality = s.frameStats.sent / total;
            if (quality < 0.95) score -= 30;
        }
    }

    return score;
}

/**
 * Pick the best available Lavalink node for recovery.
 * Prefers 'owo' (self-hosted), but falls back to the healthiest public node.
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {number} timeoutMs
 * @param {boolean} isSpotify
 * @returns {Promise<string|null>} name of the best node, or null if none ready
 */
async function getBestNode(kazagumo, timeoutMs = 10000, isSpotify = false) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        let bestName = null;
        let bestScore = -10000;

        for (const [name, node] of kazagumo.shoukaku.nodes) {
            const s = scoreNode(node, isSpotify);
            if (s > bestScore) {
                bestScore = s;
                bestName = name;
            }
        }

        if (bestName && bestScore > 0) {
            return bestName;
        }

        await new Promise(r => setTimeout(r, 1000));
    }
    return null;
}

/**
 * Wait until a specific Lavalink node is connected.
 * Kept for backwards compatibility, but getBestNode is preferred for recovery.
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {string} nodeName
 * @param {number} timeoutMs
 * @returns {Promise<string|null>} name of the available node, or null if none ready
 */
async function waitForNode(kazagumo, nodeName, timeoutMs = 15000) {
    const CONNECTED = 1;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const node = kazagumo.shoukaku.nodes.get(nodeName);
        if (node && node.state === CONNECTED) {
            return nodeName;
        }

        for (const [name, n] of kazagumo.shoukaku.nodes) {
            if (n.state === CONNECTED) {
                return name;
            }
        }

        await new Promise(r => setTimeout(r, 1000));
    }
    return null;
}

/**
 * Attempt session recovery for a guild.
 * If a recovery is already in progress, the failed track is added to the pending
 * list and the caller awaits the existing recovery promise (no duplicate work).
 *
 * @param {import('discord.js').Client} client
 * @param {import('kazagumo').KazagumoPlayer} player - the broken player
 * @param {object|null} failedTrack - the track that triggered the error
 * @param {string} source - caller identifier for logging (e.g. 'PlayerError', 'PlayerResolveError')
 * @returns {Promise<boolean>} true if recovery succeeded
 */
async function recoverSession(client, player, failedTrack, source) {
    const guildId = player.guildId;

    // ─── Cooldown check: ignore stale errors right after a successful recovery ───
    const cooldownUntil = recoveryCooldowns.get(guildId);
    if (cooldownUntil && Date.now() < cooldownUntil) {
        logger.info(source, `Ignoring stale session error for guild ${guildId} (recovery cooldown active, ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s left). Track: "${failedTrack?.title || 'none'}"`);
        return true; // Pretend recovery succeeded — the new player is already playing
    }

    // ─── If recovery already in progress, just accumulate the failed track ───
    if (activeRecoveries.has(guildId)) {
        const entry = activeRecoveries.get(guildId);
        if (failedTrack) {
            // Avoid duplicate tracks (same URI)
            const isDuplicate = entry.failedTracks.some(t => t.uri === failedTrack.uri);
            if (!isDuplicate) {
                entry.failedTracks.push(failedTrack);
            }
        }
        logger.info(source, `Recovery already in progress for guild ${guildId}. Queued track: "${failedTrack?.title || 'none'}".`);
        return entry.promise;
    }

    // ─── Track rapid re-failures: if we just recovered and session is lost again, ───
    //     the node's session ID is stale and needs a reconnect.
    const lastRecoveryCooldown = recoveryCooldowns.get(guildId);
    if (lastRecoveryCooldown && Date.now() < lastRecoveryCooldown) {
        // We're inside a cooldown from a recent "successful" recovery, but session
        // is already lost again. This means the recovery was a false positive.
        // Track it on the player's node so we can force-reconnect.
        const currentPlayer = client.kazagumo?.players?.get(guildId);
        const nodeName = currentPlayer?.shoukaku?.node?.name || player?.shoukaku?.node?.name || 'owo';
        const prev = nodeSessionFailures.get(nodeName) || { count: 0, lastSeen: 0 };
        nodeSessionFailures.set(nodeName, { count: prev.count + 1, lastSeen: Date.now() });
        logger.warn(source, `Rapid re-failure for guild ${guildId} on node "${nodeName}". Session failure count: ${prev.count + 1}`);
        
        // Clear the cooldown so recovery can proceed
        recoveryCooldowns.delete(guildId);
    }

    // ─── Start new recovery ──────────────────────────────────────────────────
    const entry = {
        failedTracks: failedTrack ? [failedTrack] : [],
        promise: null,
    };

    entry.promise = _doRecovery(client, player, entry, source);
    activeRecoveries.set(guildId, entry);

    try {
        return await entry.promise;
    } finally {
        activeRecoveries.delete(guildId);
    }
}

/**
 * Internal recovery logic with retries.
 */
async function _doRecovery(client, player, entry, source) {
    const guildId = player.guildId;
    const textId = player.textId;
    const voiceId = player.voiceId;
    const volume = player.volume;
    const loop = player.loop;

    // Capture remaining queue tracks (excluding the currently failing track)
    let queueTracks = [];
    try {
        queueTracks = [...player.queue];
    } catch {
        // Queue may already be destroyed
    }

    const textChannel = client.channels.cache.get(textId);

    // ─── Destroy the broken player ───────────────────────────────────────────
    try {
        client.selfDisconnecting.add(guildId);
        await player.destroy().catch(() => {});
    } catch {
        // Already destroyed, that's fine
    } finally {
        client.selfDisconnecting.delete(guildId);
    }

    // ─── Wait for Discord shard to be ready ──────────────────────────────────
    logger.info(source, `Waiting for Discord shard to be ready for guild ${guildId}...`);
    const shardReady = await waitForShard(client, guildId, 20000);
    if (!shardReady) {
        logger.error(source, `Discord shard not ready after 20s for guild ${guildId}. Aborting recovery.`);
        if (textChannel) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Ошибка восстановления')
                .setDescription(
                    'Discord-соединение не восстановилось вовремя. Попробуй заново использовать `/play`.'
                );
            await textChannel.send({ embeds: [errorEmbed] }).catch(() => {});
        }
        return false;
    }
    logger.info(source, `Discord shard ready for guild ${guildId}. Starting recovery attempts...`);

    // ─── Retry loop with exponential backoff ─────────────────────────────────
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const delay = BASE_DELAY_MS * attempt;
        logger.info(source, `Recovery attempt ${attempt}/${MAX_RETRIES} for guild ${guildId}. Waiting ${delay}ms...`);

        await new Promise(r => setTimeout(r, delay));

        // Double-check shard is still ready (could drop again)
        const guild = client.guilds.cache.get(guildId);
        const shard = guild ? client.ws.shards.get(guild.shardId) : null;
        if (!shard || shard.status !== SHARD_READY) {
            logger.warn(source, `Shard not ready on attempt ${attempt}/${MAX_RETRIES} for guild ${guildId}. Waiting...`);
            const ready = await waitForShard(client, guildId, 15000);
            if (!ready) {
                logger.warn(source, `Shard still not ready. Skipping attempt ${attempt}.`);
                if (attempt === MAX_RETRIES) break;
                continue;
            }
        }

        // Pick the best available node (with health scoring)
        const kazagumo = client.kazagumo;

        // Determine if the queue is mostly Spotify to route to correct node
        const isSpotify = (entry.failedTracks[0] && entry.failedTracks[0].sourceName === 'spotify') || 
                          (queueTracks[0] && queueTracks[0].sourceName === 'spotify');

        if (isSpotify) {
            const { ensurePublicNodes } = require('./nodes');
            await ensurePublicNodes(kazagumo);
        }

        const availableNode = await getBestNode(kazagumo, 5000, isSpotify);

        if (!availableNode) {
            logger.warn(source, `No Lavalink node ready on attempt ${attempt}/${MAX_RETRIES} for guild ${guildId}.`);
            if (attempt === MAX_RETRIES) break;
            continue;
        }

        // ─── Stale session detection & node reconnect ─────────────────────
        // If this node has been producing repeated "Session not found" errors,
        // the Lavalink session ID is stale. Force-reconnect the node to get
        // a fresh session before trying to create a player.
        const nodeFailure = nodeSessionFailures.get(availableNode);
        if (nodeFailure && nodeFailure.count >= NODE_RECONNECT_THRESHOLD && 
            (Date.now() - nodeFailure.lastSeen) < NODE_FAILURE_WINDOW_MS) {
            logger.warn(source, `Node "${availableNode}" has ${nodeFailure.count} consecutive session failures. Force-reconnecting to get fresh session...`);
            
            const node = kazagumo.shoukaku.nodes.get(availableNode);
            if (node) {
                try {
                    // Disconnect and let Shoukaku auto-reconnect with a new session
                    node.disconnect();
                    // Wait for reconnection
                    await new Promise(r => setTimeout(r, 5000));
                    // Verify node is back
                    const reconnectedNode = kazagumo.shoukaku.nodes.get(availableNode);
                    if (reconnectedNode && reconnectedNode.state === 1) {
                        logger.info(source, `Node "${availableNode}" reconnected successfully with fresh session.`);
                        nodeSessionFailures.delete(availableNode);
                    } else {
                        logger.warn(source, `Node "${availableNode}" not yet reconnected. Waiting more...`);
                        await new Promise(r => setTimeout(r, 5000));
                    }
                } catch (reconnectErr) {
                    logger.error(source, `Failed to reconnect node "${availableNode}":`, reconnectErr);
                }
            }
        }

        logger.info(source, `Using node "${availableNode}" for recovery attempt ${attempt}.`);

        try {
            const newPlayer = await kazagumo.createPlayer({
                guildId,
                textId,
                voiceId,
                volume,
                deaf: true,
                nodeName: availableNode,
            });

            // Restore loop mode
            newPlayer.setLoop(loop);

            // Re-add all failed tracks (accumulated during recovery)
            const allFailedTracks = entry.failedTracks;
            for (const t of allFailedTracks) {
                t.track = ""; // Strip base64 string to force re-resolve on the new node
                newPlayer.queue.add(t);
            }

            // Re-add remaining queue
            for (const t of queueTracks) {
                // Avoid duplicates (a track could be in both failedTracks and queue)
                const isDuplicate = allFailedTracks.some(ft => ft.uri === t.uri);
                if (!isDuplicate) {
                    t.track = ""; // Strip base64 string to force re-resolve on the new node
                    newPlayer.queue.add(t);
                }
            }

            // Start playback
            if (!newPlayer.playing && !newPlayer.paused && newPlayer.queue.length > 0) {
                newPlayer.play();
            }

            logger.info(source, `✅ Successfully recovered session for guild ${guildId} on attempt ${attempt}. Queue: ${newPlayer.queue.length} tracks.`);

            // Reset node failure counter on success
            nodeSessionFailures.delete(availableNode);

            // Calculate dynamic cooldown based on queue size
            // Kazagumo resolves old tracks sequentially; 1000+ tracks take minutes to fail.
            // Give 400ms per track to fail, with a minimum of 15 seconds.
            const dynamicCooldownMs = Math.max(15000, newPlayer.queue.length * 400);

            // Set cooldown to prevent stale errors from old player's resolve queue
            // from triggering another recovery and destroying this new player
            recoveryCooldowns.set(guildId, Date.now() + dynamicCooldownMs);
            setTimeout(() => recoveryCooldowns.delete(guildId), dynamicCooldownMs + 1000);
            logger.info(source, `Set recovery cooldown to ${Math.ceil(dynamicCooldownMs/1000)}s due to queue size (${newPlayer.queue.length} tracks)`);

            if (textChannel) {
                const recoveryEmbed = new EmbedBuilder()
                    .setColor(0xFFA500)
                    .setDescription('⚠️ Произошёл обрыв сессии, но я уже восстановилась и продолжаю играть!');
                await textChannel.send({ embeds: [recoveryEmbed] }).catch(() => {});
            }

            return true;
        } catch (createError) {
            const createErrStr = String(createError);
            logger.error(source, `Recovery attempt ${attempt}/${MAX_RETRIES} failed for guild ${guildId}:`, createError);

            // Track "Session not found" failures per node for stale session detection
            if (createErrStr.toLowerCase().includes('session not found')) {
                const prev = nodeSessionFailures.get(availableNode) || { count: 0, lastSeen: 0 };
                nodeSessionFailures.set(availableNode, { count: prev.count + 1, lastSeen: Date.now() });
                logger.warn(source, `Node "${availableNode}" session failure count: ${prev.count + 1}`);
            }

            if (attempt === MAX_RETRIES) break;
        }
    }

    // ─── All retries exhausted ───────────────────────────────────────────────
    logger.error(source, `❌ All ${MAX_RETRIES} recovery attempts failed for guild ${guildId}.`);

    if (textChannel) {
        const trackNames = entry.failedTracks.map(t => t.title).join(', ');
        const errorEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('❌ Ошибка при обработке трека')
            .setDescription(
                `Сессия с Lavalink была потеряна и восстановить не удалось после ${MAX_RETRIES} попыток.\n` +
                (trackNames ? `Треки: **${trackNames}**\n` : '') +
                `Попробуй заново использовать \`/play\`.`
            );
        await textChannel.send({ embeds: [errorEmbed] }).catch(() => {});
    }

    return false;
}

/**
 * Check if a guild is in recovery cooldown (recently recovered successfully).
 * Used by event handlers to suppress stale errors from the old player.
 * @param {string} guildId
 * @returns {boolean}
 */
function isInCooldown(guildId) {
    const cooldownUntil = recoveryCooldowns.get(guildId);
    return cooldownUntil && Date.now() < cooldownUntil;
}

module.exports = { recoverSession, isInCooldown };
