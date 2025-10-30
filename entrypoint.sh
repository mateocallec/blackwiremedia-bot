#!/bin/bash
set -e

# Make sure the logs directory exists
mkdir -p /app/data/logs

echo "Setting up cron jobs..."

# Create cron file in temp location
CRON_FILE=/tmp/cron_jobs

# Clear previous cron jobs
> $CRON_FILE

# Add cron jobs
echo "0 0 * * * cd /app && npm run crawler >> /app/data/logs/crawler.log 2>&1" >> $CRON_FILE
echo "0 * * * * cd /app && npm run generator >> /app/data/logs/generator.log 2>&1" >> $CRON_FILE
echo "0 */3 * * * cd /app && npm run social >> /app/data/logs/social.log 2>&1" >> $CRON_FILE

# Load cron jobs into crontab
crontab $CRON_FILE

echo "Running all tasks once at startup..."

# Run all tasks immediately
cd /app
npm run crawler >> /app/data/logs/crawler.log 2>&1
npm run generator >> /app/data/logs/generator.log 2>&1
npm run social >> /app/data/logs/social.log 2>&1

echo "Starting cron in foreground..."
cron -f
