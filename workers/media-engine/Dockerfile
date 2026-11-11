FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV PORT=8787
ENV DATA_DIR=/data
ENV REMOTION_CHROME_MODE=chrome-for-testing

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 python3-pip curl ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libdrm2 libexpat1 libgbm1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libxrender1 \
    libxshmfence1 libxss1 libxtst6 xdg-utils && \
    pip3 install --break-system-packages --no-cache-dir yt-dlp && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p /data/jobs /data/outputs /tmp/nexus-work

EXPOSE 8787
VOLUME ["/data"]
CMD ["node", "server.mjs"]
