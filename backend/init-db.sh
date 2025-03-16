#!/bin/bash
su postgres -c "postgres -D /var/lib/postgresql/data &"

echo "Waiting for PostgreSQL to start..."
until pg_isready -h localhost -U postgres; do
  sleep 2
done

echo "PostgreSQL is ready. Executing SQL script..."
psql -U postgres -d saito_db -f /docker-entrypoint-initdb.d/1741604050_up.sql
