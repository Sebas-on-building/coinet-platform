# 💾 How to Access Backups on macOS

## 📍 Backup Location

**Full Path**: `/Users/sebastian/Desktop/Arbeit/Coinet v1/coinet-platform/backups/`

**Current Backup**: `chat-history-2025-12-02.json` (220 KB)

---

## 🖥️ Method 1: Terminal Commands

### From `apps/coinet-platform/` directory:

```bash
# List all backups
ls -lh ../../backups/

# View backup file (first 20 lines)
head -20 ../../backups/chat-history-2025-12-02.json

# View formatted JSON (if you have jq installed)
cat ../../backups/chat-history-2025-12-02.json | jq '.' | head -50

# Count conversations in backup
cat ../../backups/chat-history-2025-12-02.json | jq '.conversations'

# View backup size
du -h ../../backups/chat-history-2025-12-02.json
```

### From project root:

```bash
# Go to project root
cd /Users/sebastian/Desktop/Arbeit/Coinet\ v1/coinet-platform

# List backups
ls -lh backups/

# View backup
head -20 backups/chat-history-2025-12-02.json
```

---

## 🗂️ Method 2: Finder (macOS GUI)

### Option A: Open in Finder from Terminal

```bash
# From apps/coinet-platform/
open ../../backups/

# From project root
open backups/
```

### Option B: Navigate Manually

1. Open **Finder**
2. Press `Cmd + Shift + G` (Go to Folder)
3. Paste: `/Users/sebastian/Desktop/Arbeit/Coinet v1/coinet-platform/backups/`
4. Press Enter

---

## 📊 Method 3: View Backup Contents

### Quick Preview:

```bash
# View backup summary
cat ../../backups/chat-history-2025-12-02.json | jq '.timestamp, .conversations, .messages'

# View first conversation
cat ../../backups/chat-history-2025-12-02.json | jq '.data[0]'

# Count total messages
cat ../../backups/chat-history-2025-12-02.json | jq '[.data[].messages | length] | add'
```

### Full Backup Structure:

```json
{
  "timestamp": "2025-12-02T16:08:27.928Z",
  "conversations": 45,
  "messages": 98,
  "data": [
    {
      "id": "...",
      "userId": "...",
      "title": "...",
      "messages": [...]
    }
  ]
}
```

---

## 🔍 Quick Reference

### Current Backup Info:
- **File**: `chat-history-2025-12-02.json`
- **Size**: 220 KB
- **Conversations**: 45
- **Messages**: 98
- **Date**: December 2, 2025

### Useful Commands:

```bash
# Quick access from anywhere
cd ~/Desktop/Arbeit/Coinet\ v1/coinet-platform/backups/

# Open in default JSON editor
open backups/chat-history-2025-12-02.json

# Copy backup to Desktop
cp backups/chat-history-2025-12-02.json ~/Desktop/

# Create compressed backup
gzip backups/chat-history-2025-12-02.json
```

---

## 💡 Pro Tips

1. **Use Finder**: `open ../../backups/` - fastest way to browse
2. **Install jq**: `brew install jq` - for pretty JSON viewing
3. **Backup to iCloud**: Copy backups folder to iCloud Drive
4. **Automate**: Set up cron job to backup regularly (see `BACKUP_STRATEGY.md`)

---

## 🚨 Restore from Backup

If you ever need to restore:

```bash
# The backup script will handle restoration
# Or manually import JSON data using Prisma Studio
npm run db:studio
```

---

**Your backups are safe and accessible!** 🎉

