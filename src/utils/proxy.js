const http = require('http');
const { spawn } = require('child_process');
const { existsSync } = require('fs');
const logger = require('./logger');

const LOCAL_YTDLP = `${process.env.HOME}/.local/bin/yt-dlp`;
const YTDLP_BIN = existsSync(LOCAL_YTDLP) ? LOCAL_YTDLP : 'yt-dlp';

function startProxy() {
    const proxyServer = http.createServer((req, res) => {
        try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            if (urlObj.pathname === '/stream' && urlObj.searchParams.has('url')) {
                const videoUrl = urlObj.searchParams.get('url');
                logger.info('Proxy', `Streaming video: ${videoUrl}`);
                
                // Spawn yt-dlp to stream audio to stdout
                const yt = spawn(YTDLP_BIN, [
                    '--no-warnings',
                    '--no-playlist',
                    '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio',
                    '-o', '-',
                    videoUrl
                ]);

                // We stream everything directly without seeking support.
                // Lavaplayer HttpAudioSourceManager can play chunked webm streams.
                res.writeHead(200, {
                    'Content-Type': 'audio/webm',
                    'Transfer-Encoding': 'chunked',
                    'Connection': 'keep-alive'
                });

                yt.stdout.pipe(res);

                // Handle client disconnect
                req.on('close', () => {
                    yt.kill('SIGKILL');
                });
                
                yt.on('error', (err) => {
                    logger.error('Proxy', `yt-dlp spawn error: ${err.message}`);
                    if (!res.headersSent) res.writeHead(500);
                    res.end();
                });
                return;
            }
            res.writeHead(404);
            res.end('Not Found');
        } catch (e) {
            logger.error('Proxy', `Internal error: ${e.message}`);
            if (!res.headersSent) {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
        }
    });

    proxyServer.listen(3000, () => {
        logger.info('Proxy', 'yt-dlp HTTP proxy listening on port 3000');
    });
}

module.exports = { startProxy };
