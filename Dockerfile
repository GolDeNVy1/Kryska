FROM node:20-alpine

# Create non-root user for security
RUN addgroup -S botgroup && adduser -S botuser -G botgroup

# Create app directory
WORKDIR /usr/src/bot

# Copy dependency manifests first (Docker layer caching)
COPY package.json package-lock.json ./

# Install yt-dlp (python3 needed as runtime)
RUN apk add --no-cache python3 py3-pip && \
    pip3 install yt-dlp --break-system-packages && \
    yt-dlp --version

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source
COPY src/ ./src/

# Copy .env (will be overridden by docker-compose env_file)
COPY .env ./

# Switch to non-root user
USER botuser

# Start the bot
CMD ["node", "src/index.js"]