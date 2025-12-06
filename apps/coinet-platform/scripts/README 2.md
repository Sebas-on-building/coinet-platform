# Database Scripts

Utility scripts for database management and backup.

## Available Scripts

### `verify-database.ts`
Verifies database connection and provides detailed status information.

**Usage:**
```bash
npm run db:verify
```

**What it does:**
- Tests database connection
- Shows connection latency
- Displays database statistics (conversations, messages, users)
- Lists recent conversations
- Verifies schema tables exist

**Example output:**
```
🔍 Verifying database connection...

📊 Database: postgresql://hostname:5432/database

✅ Connection successful! (45ms)

📈 Database Statistics:

   Conversations: 1,234
   Messages: 5,678
   Unique Users: 42

📅 Recent Activity:

   1. Bitcoin Analysis (15 messages) - 12/2/2024, 3:45 PM
   2. SUPRA Price Check (3 messages) - 12/2/2024, 2:30 PM
   ...

🔧 Schema Verification:

   ✅ conversations
   ✅ messages
   ✅ agents
   ...
```

### `backup-chat-history.ts`
Backs up all conversations and messages to SQL/JSON files.

**Usage:**
```bash
npm run db:backup
```

**What it does:**
- Creates SQL backup using `pg_dump` (if available)
- Falls back to JSON export if `pg_dump` fails
- Saves backups to `backups/` directory
- Creates summary file with statistics
- Lists recent backups

**Backup location:**
- `backups/chat-history-YYYY-MM-DD.sql` - SQL backup
- `backups/chat-history-YYYY-MM-DD.json` - JSON backup (fallback)
- `backups/backup-summary-YYYY-MM-DD.json` - Backup metadata

**Example output:**
```
💾 Starting chat history backup...

✅ Database connection verified

📊 Current Database Statistics:
   Conversations: 1,234
   Messages: 5,678
   Unique Users: 42

📦 Creating SQL backup...
✅ Backup created successfully!

📄 File: backups/chat-history-2024-12-02.sql
📊 Size: 2.45 MB

📚 Recent Backups:
   1. chat-history-2024-12-02.sql (2.45 MB) - 12/2/2024, 4:00 PM
   2. chat-history-2024-12-01.sql (2.38 MB) - 12/1/2024, 4:00 PM
   ...
```

## Automated Backups

### Using Cron (Linux/Mac)
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/coinet-platform/apps/coinet-platform && npm run db:backup
```

### Using Task Scheduler (Windows)
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 2:00 AM
4. Action: Start a program
5. Program: `npm`
6. Arguments: `run db:backup`
7. Start in: `C:\path\to\coinet-platform\apps\coinet-platform`

### Using Railway Cron Jobs
Railway supports cron jobs. Add to your `railway.json`:
```json
{
  "cron": {
    "backup": {
      "schedule": "0 2 * * *",
      "command": "cd apps/coinet-platform && npm run db:backup"
    }
  }
}
```

## Restoring from Backup

### SQL Backup
```bash
# Restore SQL backup
psql $DATABASE_URL < backups/chat-history-2024-12-02.sql
```

### JSON Backup
Use Prisma Studio or create a restore script to import JSON data.

## Troubleshooting

### Database verification fails
- Check `DATABASE_URL` environment variable
- Verify database server is running
- Check network connectivity
- Verify credentials are correct

### Backup fails
- Ensure `pg_dump` is installed (for SQL backups)
- Check write permissions for `backups/` directory
- Verify `DATABASE_URL` is set correctly
- JSON backup will work even without `pg_dump`

### Missing backups directory
The script will create `backups/` directory automatically if it doesn't exist.

## Security Notes

- Backups contain sensitive data (conversations, messages)
- Store backups securely (encrypted, access-controlled)
- Don't commit backups to git (already in `.gitignore`)
- Consider cloud backup (AWS S3, Google Cloud Storage, etc.)

