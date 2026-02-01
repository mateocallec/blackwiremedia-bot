<div align="center">
    <a href="https://github.com/mateocallec/blackwiremedia-bot"><img src="https://github.com/mateocallec/blackwiremedia-bot/blob/main/docs/img/icon-2048x2048.png?raw=true" alt="BlackWire Media Bot" height="217" /></a>
</div>

<div>&nbsp;</div>

<div align="center">
    <a href="https://github.com/mateocallec/blackwiremedia-bot/releases"><img src="https://img.shields.io/github/v/release/mateocallec/blackwiremedia-bot?label=lastest%20release&color=blue" alt="Latest release" /></a>
    <a href="https://github.com/mateocallec/blackwiremedia-bot/releases"><img src="https://img.shields.io/badge/platform-Debian-darkred" alt="Supported platforms" /></a>
    <a href="https://hub.docker.com/r/mateocallec/blackwiremedia-bot"><img src="https://img.shields.io/badge/docker-blackwiremedia--bot-blue?logo=docker" alt="Docker" /></a>
</div>

<hr />

**BlackWire Media Bot** is a Node.js service that automatically fetches high-severity CVEs, generates content using AI, and creates social media-ready images. It is designed for internal use and is proprietary software (UNLICENSED).

---

## Features

- Fetches recent CVEs (Common Vulnerabilities and Exposures) from NIST.
- Filters and prioritizes high-severity vulnerabilities (CVSS ≥ 8).
- Generates AI-based titles, descriptions, and content using Google Gemini API.
- Creates visually appealing social media images using Canvas.
- Supports Docker deployment for easy setup and scalability.
- Use the BlueSky API to publish the CVE.

---

## Repository Structure

```

.
├── src/                   # Main service code
├── scripts/               # Helper scripts for building, container management, and DB inspection
├── data/                  # Local database and generated output
├── docs/                  # Documentation files
├── Dockerfile             # Docker build configuration
├── docker-compose.yml     # Docker Compose setup
├── .env                   # Environment variables (API keys, etc.)
├── package.json           # Node.js dependencies
└── README.md              # Project overview

````

---

## Requirements

- Node.js >= 20
- Docker (optional, for containerized deployment)
- NVD API key and Google Gemini API key

---

## Quick Start

### 1. Local development

```bash
# Install dependencies
npm install

# Run the bot
node src/index.js
````

### 2. Docker

```bash
# Build Docker image
docker build -t mateocallec/blackwiremedia-bot .

# Run with docker-compose
docker-compose up -d
```

---

## Useful Scripts

Located in the `scripts/` directory:

* `build.sh` — Build the Docker image.
* `create_container.sh` — Start a new container.
* `create_container_env.sh` — Setup container environment variables.
* `close_container.sh` — Stop a running container.
* `list_db.sh` — Inspect the SQLite database.
* `push.sh` — Push the Docker image to DockerHub.

---

## License

**Proprietary / UNLICENSED** — for internal use only. Redistribution or modification without permission is prohibited.

---

## Author

Mateo Florian Callec — [mateocallec](https://github.com/mateocallec)
