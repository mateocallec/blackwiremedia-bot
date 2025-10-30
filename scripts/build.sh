#!/bin/bash

# Get current directory path
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$SCRIPT_DIR/.."

# Create docker image
sudo docker build -f "$PROJECT_DIR/Dockerfile" -t mateocallec/blackwiremedia-bot:latest $PROJECT_DIR/
