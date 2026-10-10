/**
 * Utilities for Lavalink nodes management
 */
const logger = require('./logger');

/**
 * Returns the name of the first available public node.
 * Checks nodes named 'Public Node 1', 'Public Node 2', etc.
 * 
 * @param {import('kazagumo').Kazagumo} kazagumo 
 * @returns {string|null} Node name or null if none available
 */
function getAvailablePublicNode(kazagumo) {
    // Collect all public nodes
    const publicNodes = [];
    for (const [name, node] of kazagumo.shoukaku.nodes) {
        if (name.startsWith('Public Node')) {
            publicNodes.push({ name, node });
        }
    }

    // Sort them by index (Public Node 1, Public Node 2) to maintain priority
    publicNodes.sort((a, b) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 999;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 999;
        return numA - numB;
    });

    // Find the first connected one
    for (const { name, node } of publicNodes) {
        if (node.state === 1) { // 1 = CONNECTED
            return name;
        }
    }

    return null; // None available
}

/**
 * Lazily initialize public nodes from environment variables if they haven't been added yet.
 * @param {import('kazagumo').Kazagumo} kazagumo 
 */
async function ensurePublicNodes(kazagumo) {
    let hasPublic = false;
    for (const name of kazagumo.shoukaku.nodes.keys()) {
        if (name.startsWith('Public Node')) {
            hasPublic = true;
            break;
        }
    }

    // If public nodes are already added, do nothing
    if (hasPublic) return;

    logger.info('Nodes', 'Spotify playlist requested. Dynamically initializing Public Nodes...');
    let added = 0;
    
    for (let i = 1; i <= 5; i++) {
        const url = process.env[`PUBLIC_NODE_${i}_URL`];
        const auth = process.env[`PUBLIC_NODE_${i}_AUTH`];
        const secure = process.env[`PUBLIC_NODE_${i}_SECURE`] === 'true';

        if (url && auth) {
            kazagumo.shoukaku.addNode({
                name: `Public Node ${i}`,
                url,
                auth,
                secure,
            });
            added++;
        }
    }

    if (added > 0) {
        // Wait briefly for WebSockets to connect
        await new Promise(r => setTimeout(r, 2000));
    }
}

/**
 * Wait up to `timeoutMs` for any public node to become connected.
 * Polls every 500ms — handles nodes that take slightly longer than the
 * ensurePublicNodes() 2-second warmup (e.g. Public Node 2 which connected at 2.2s).
 *
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {number} timeoutMs
 * @returns {Promise<string|null>} name of the first connected public node, or null
 */
async function waitForPublicNode(kazagumo, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const name = getAvailablePublicNode(kazagumo);
        if (name) return name;
        await new Promise(r => setTimeout(r, 500));
    }
    return null;
}

module.exports = {
    getAvailablePublicNode,
    waitForPublicNode,
    ensurePublicNodes,
};
