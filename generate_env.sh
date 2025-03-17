#!/bin/bash

BASE_PATH=$(dirname "$(realpath "$0")")

echo "BACKEND_PATH=$BASE_PATH/backend" > .env
echo "FRONTEND_PATH=$BASE_PATH/frontend" >> .env

echo ".env generate"
