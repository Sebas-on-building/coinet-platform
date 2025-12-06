# 💾 Chat History Backup Strategy

**Purpose**: Protect your valuable chat history and ensure continuity across sessions.

---

## 🎯 Why Backups Matter

Your chat history contains:
- **Conversations**: All your AI interactions
- **Messages**: Every question and answer
- **Context**: User preferences, portfolio data, watchlists
- **Insights**: AI-generated analysis and recommendations

**This data is stored in PostgreSQL, NOT in git.** If you lose database access or the database is reset, you lose all chat history.

---

## 🔄 Backup Methods

### 1. Automated Script (Recommended)

**Quick backup:**
```bash
cd apps/coinet-platform
npm run db:backup
```

**What it does:**
- Creates SQL backup using `pg_dump` (if available)
- Falls back to JSON export if `pg_dump` fails
- Saves to `backups/chat-history-YYYY-MM-DD.sql`
- Creates summary file with statistics
- Lists recent backups

**Backup location:**
```
backups/
├── chat-history-2024-12-02.sql          # SQL backup
├── chat-history-2024-12-02.json         # JSON backup (fallback)
└── backup-summary-2024-12-02.json       # Metadata
```

### 2. Manual pg_dump

**Direct SQL backup:**
```bash
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

**With compression:**
```bash
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
```

### 3. Railway Automatic Backups

Railway provides automatic daily backups:
1. Go to Railway dashboard
2. Select your PostgreSQL service
3. Check "Backups" tab
4. Download backups as needed

**Note**: Railway backups are stored for 7 days by default.

---

## 📅 Backup Schedule

### Recommended Frequency

| Frequency | Use Case | Method |
|-----------|----------|--------|
| **Daily** | Production/Active use | Automated script + Railway |
| **Weekly** | Development/Testing | Manual backup |
| **Before major changes** | Schema migrations, updates | Manual backup |
| **Monthly** | Long-term archive | Compressed backup + cloud storage |

### Setting Up Automated Backups

#### Option 1: Cron Job (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/coinet-platform/apps/coinet-platform && npm run db:backup >> /var/log/coinet-backup.log 2>&1
```

#### Option 2: Task Scheduler (Windows)

1. Open Task Scheduler
2. Create Basic Task
3. **Trigger**: Daily at 2:00 AM
4. **Action**: Start a program
   - Program: `npm`
   - Arguments: `run db:backup`
   - Start in: `C:\path\to\coinet-platform\apps\coinet-platform`

#### Option 3: Railway Cron (Recommended for Production)

Add to `railway.json`:
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

---

## 🔐 Backup Storage Strategy

### Local Storage (Short-term)
- **Location**: `backups/` directory
- **Retention**: Keep last 7-30 days
- **Purpose**: Quick recovery from recent issues

### Cloud Storage (Long-term)
- **AWS S3**: Encrypted, versioned backups
- **Google Cloud Storage**: Cost-effective, reliable
- **Dropbox/OneDrive**: Simple, accessible
- **Purpose**: Disaster recovery, long-term archive

### Backup Rotation

**Keep:**
- Last 7 days: Daily backups
- Last 4 weeks: Weekly backups
- Last 12 months: Monthly backups
- Forever: Yearly backups (compressed)

**Example script:**
```bash
#!/bin/bash
# Keep last 7 days, delete older backups
find backups/ -name "chat-history-*.sql" -mtime +7 -delete
```

---

## 🔄 Restoring from Backup

### SQL Backup Restore

```bash
# Restore SQL backup
psql $DATABASE_URL < backups/chat-history-2024-12-02.sql

# Or with Railway
railway run psql $DATABASE_URL < backups/chat-history-2024-12-02.sql
```

### JSON Backup Restore

JSON backups require a restore script (not included, but can be created if needed).

### Railway Backup Restore

1. Go to Railway dashboard
2. Select PostgreSQL service
3. Go to "Backups" tab
4. Click "Restore" on desired backup
5. **Warning**: This replaces current database!

---

## ✅ Backup Verification

### Verify Backup Integrity

```bash
# Check backup file exists and has content
ls -lh backups/chat-history-*.sql

# Verify SQL backup (check first few lines)
head -20 backups/chat-history-2024-12-02.sql

# Test restore to temporary database (optional)
createdb test_restore
psql test_restore < backups/chat-history-2024-12-02.sql
dropdb test_restore
```

### Verify Database Connection

```bash
# Test database connection
npm run db:verify

# Check backup statistics match current database
npm run db:verify | grep -E "Conversations|Messages"
```

---

## 🚨 Disaster Recovery Plan

### Scenario 1: Database Connection Lost

1. **Check Railway dashboard** for PostgreSQL service status
2. **Get new DATABASE_URL** if database was recreated
3. **Restore from backup**:
   ```bash
   psql $DATABASE_URL < backups/chat-history-LATEST.sql
   ```
4. **Verify restore**:
   ```bash
   npm run db:verify
   ```

### Scenario 2: Database Corrupted

1. **Stop application** to prevent further corruption
2. **Create emergency backup** (if possible):
   ```bash
   pg_dump $DATABASE_URL > emergency-backup.sql
   ```
3. **Restore from last known good backup**
4. **Verify data integrity**
5. **Restart application**

### Scenario 3: Complete Data Loss

1. **Don't panic** - backups exist
2. **Identify latest backup**:
   ```bash
   ls -lt backups/ | head -5
   ```
3. **Restore backup**:
   ```bash
   psql $DATABASE_URL < backups/chat-history-LATEST.sql
   ```
4. **Run migrations** (if schema changed):
   ```bash
   npm run db:migrate
   ```
5. **Verify restore**:
   ```bash
   npm run db:verify
   ```

---

## 📊 Backup Monitoring

### Check Backup Status

```bash
# List all backups
ls -lh backups/

# Check backup sizes
du -sh backups/

# View backup summary
cat backups/backup-summary-*.json | jq .
```

### Monitor Backup Success

Add to your monitoring:
- **Backup file creation**: Check if backup file exists after scheduled time
- **Backup file size**: Alert if backup is suspiciously small (might be empty)
- **Backup age**: Alert if no backup created in last 25 hours

---

## 💡 Best Practices

1. **Test restores regularly**: Don't wait for disaster to test backups
2. **Multiple backup locations**: Local + cloud = redundancy
3. **Encrypt backups**: Especially if storing in cloud
4. **Document restore process**: Write down steps before you need them
5. **Monitor backup success**: Automated alerts if backup fails
6. **Version backups**: Keep multiple versions, not just latest
7. **Verify backups**: Check file integrity after creation

---

## 🔧 Troubleshooting

### Backup fails with "pg_dump: command not found"

**Solution**: Install PostgreSQL client tools:
```bash
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# Windows
# Download from https://www.postgresql.org/download/windows/
```

**Alternative**: Script will fall back to JSON backup automatically.

### Backup file is empty

**Possible causes:**
- Database is empty (no conversations yet)
- Database connection failed
- Permissions issue

**Solution**: Check `npm run db:verify` first, then retry backup.

### Backup takes too long

**For large databases:**
- Use compression: `pg_dump | gzip`
- Backup specific tables only
- Use `pg_dump --jobs=4` for parallel backup (PostgreSQL 12+)

---

## 📝 Quick Reference

```bash
# Verify database connection
npm run db:verify

# Create backup
npm run db:backup

# List backups
ls -lh backups/

# Restore backup
psql $DATABASE_URL < backups/chat-history-YYYY-MM-DD.sql

# Check backup summary
cat backups/backup-summary-YYYY-MM-DD.json
```

---

**Remember**: Your chat history is valuable. Back it up regularly!

