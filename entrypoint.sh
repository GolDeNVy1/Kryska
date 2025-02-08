#!/bin/bash

echo "Cleaning containers that depends to this project..."
docker compose down --remove-orphans

echo "Deleting images that depends to this project..."
docker image prune -f
docker rmi $(docker rmi $(docker images -q)) || echo "Images not found"

echo "Cleaning cached builds..."
docker builder prune -f

echo "Setting rules for "plugins" folder..."
sudo chmod -R 755 /home/goldenvy/Music/bots/Kryska/plugins
sudo chown -R $USER:$USER /home/goldenvy/Music/bots/Kryska/plugins

echo "Starting project..."
docker compose up -d
