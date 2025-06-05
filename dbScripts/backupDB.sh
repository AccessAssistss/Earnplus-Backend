#!/bin/bash

# === Load environment variables ===
source /root/Earnplus-Backend/.env

# === Timestamped filename ===
TIMESTAMP=$(date +"%Y%m%d_%H%M")
FILENAME="prod_db_backup_$TIMESTAMP.sql"
FULL_PATH="$BACKUP_DIR/$FILENAME"

# === Create backup directory if it doesn't exist ===
mkdir -p "$BACKUP_DIR"

# === Export PostgreSQL password if needed (or use .pgpass) ===
export PGPASSWORD="$PGPASSWORD"

# === Perform the backup ===
pg_dump -U "$PGUSER" "$PGDATABASE" > "$FULL_PATH"

# === Optional: Compress the backup ===
# gzip "$FULL_PATH"

echo "Backup completed: $FULL_PATH"

# === Run cleanup script (optional) ===
/root/Earnplus-Backend/dbScripts/cleanupOldBackups.sh
