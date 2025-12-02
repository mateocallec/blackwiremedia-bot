#!/bin/bash
set -e

# Ensure the logs directory exists
mkdir -p /app/data/logs
echo "Setting up cron jobs..."

# Create a temporary cron file
CRON_FILE=/tmp/cron_jobs
# Clear previous cron jobs
> "$CRON_FILE"

# Add PATH and SHELL
echo "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" >> "$CRON_FILE"
echo "SHELL=/bin/bash" >> "$CRON_FILE"

# Export all environment variables to the cron file
env | grep -vE '^(SHLVL|PWD|OLDPWD|TERM|_)=' | while read -r line; do
  echo "$line" >> "$CRON_FILE"
done

# Add cron jobs with environment variables
echo "0 0 * * * cd /app && /usr/local/bin/npm run crawler >> /app/data/logs/crawler.log 2>&1" >> "$CRON_FILE"
echo "0 * * * * cd /app && /usr/local/bin/npm run generator >> /app/data/logs/generator.log 2>&1" >> "$CRON_FILE"
echo "10 */3 * * * cd /app && /usr/local/bin/npm run social >> /app/data/logs/social.log 2>&1" >> "$CRON_FILE"

# Load cron jobs into crontab
crontab "$CRON_FILE"

echo "Running required tasks once at startup..."

# Run required tasks immediately
cd /app
/usr/local/bin/npm run crawler >> /app/data/logs/crawler.log 2>&1
/usr/local/bin/npm run generator >> /app/data/logs/generator.log 2>&1

echo "Starting cron in foreground..."
cron -f
