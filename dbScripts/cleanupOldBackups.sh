# === Load environment variables ===
source /home/aman/Sourabh/Nodejs/Earnplus/.env

# === Delete .sql files older than 7 days ===
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +7 -exec rm -f {} \;

echo "Cleanup complete: Old backups deleted from $BACKUP_DIR"
