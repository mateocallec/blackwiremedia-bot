# Use official Node.js Debian-based slim image
FROM node:20-slim

WORKDIR /app

# Install build dependencies + cron
RUN apt-get update && apt-get install -y \
    python3 \
    python3-dev \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libgif-dev \
    libjpeg-dev \
    libpng-dev \
    curl \
    bash \
    cron \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
ENTRYPOINT ["/entrypoint.sh"]
