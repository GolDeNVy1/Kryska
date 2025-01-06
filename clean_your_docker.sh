#!/bin/bash

echo "Cleaning containers that depends to this project..."
docker compose down --remove-orphans

echo "Deleting images that depends to this project..."
docker image prune -f
docker rmi $(docker rmi $(docker images -q)) || echo "Images not found"

echo "Cleaning cached builds..."
docker builder prune -f