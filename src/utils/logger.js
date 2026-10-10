/**
 * Simple structured logger with levels, timestamps, and colored output.
 * Replaces raw console.log/warn/error across the project.
 */

const LEVELS = {
    DEBUG: { priority: 0, color: '\x1b[36m', label: 'DEBUG' },
    INFO:  { priority: 1, color: '\x1b[32m', label: 'INFO ' },
    WARN:  { priority: 2, color: '\x1b[33m', label: 'WARN ' },
    ERROR: { priority: 3, color: '\x1b[31m', label: 'ERROR' },
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

const currentLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase();

function shouldLog(level) {
    const current = LEVELS[currentLevel] || LEVELS.INFO;
    const target = LEVELS[level];
    return target && target.priority >= current.priority;
}

function formatTimestamp() {
    return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

function log(level, context, message, ...args) {
    if (!shouldLog(level)) return;

    const lvl = LEVELS[level];
    const timestamp = `${DIM}${formatTimestamp()}${RESET}`;
    const tag = `${lvl.color}[${lvl.label}]${RESET}`;
    const ctx = context ? `${DIM}(${context})${RESET} ` : '';

    console[level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log'](
        `${timestamp} ${tag} ${ctx}${message}`,
        ...args
    );
}

const logger = {
    debug: (context, message, ...args) => log('DEBUG', context, message, ...args),
    info:  (context, message, ...args) => log('INFO',  context, message, ...args),
    warn:  (context, message, ...args) => log('WARN',  context, message, ...args),
    error: (context, message, ...args) => log('ERROR', context, message, ...args),
};

module.exports = logger;
