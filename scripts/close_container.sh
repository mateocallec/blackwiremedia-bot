#!/bin/bash

# Get current directory path
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$SCRIPT_DIR/.."

sudo docker-compose -f "$PROJECT_DIR/docker-compose.yml" down
