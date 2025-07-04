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
pg_dump -U "$PGUSER" -F c -f "$FULL_PATH" "$PGDATABASE"

# === Check success ===
if [ $? -eq 0 ]; then
  echo "Backup completed: $FULL_PATH"
else
  echo "Backup failed for: $FULL_PATH" >&2
  rm -f "$FULL_PATH"  # Remove empty/invalid file
  exit 1
fi

# === Run cleanup script (optional) ===
/root/Earnplus-Backend/dbScripts/cleanupOldBackups.sh
