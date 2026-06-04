# Follow-up: Production DB schema drift (Railway)

**Status:** OPEN — dedicated session required (NOT a quick fix)
**Opened:** 2026-06-04
**Severity:** Medium (latent; not currently breaking chat)
**Owner:** TBD

## Summary

On every production boot, the start command runs a Prisma schema sync
(`prisma db push`) against the Railway Postgres. As of deploy `243b4232`
(2026-06-04), that sync **cannot apply 3 changes** because they are
destructive against existing data — yet the startup script logs
`✅ Database schema synced` immediately afterward, which is **misleading**.
Result: the production DB schema does **not** match `prisma/schema.prisma`.

## Evidence (deploy `243b4232` startup logs, 2026-06-04 07:36 UTC)

```
🔄 Syncing database schema...
Error:
⚠️ We found changes that cannot be executed:
  • Changed the type of `role` on the `chat_messages` table. No cast exists,
    the column would be dropped and recreated, which cannot be done since the
    column is required and there is data in the table.
  • Changed the type of `category` on the `user_memories` table. No cast exists...
  • Added the required column `passwordHash` to the `users` table without a
    default value. There are 13 rows in this table, it is not possible to
    execute this step.
Use the --force-reset flag to drop the database before push ... All data will be lost.
✅ Database schema synced   <-- logged despite the error above
```

## Drift items

| Table | Column | schema.prisma wants | Live DB | Runtime risk |
|---|---|---|---|---|
| `chat_messages` | `role` | new type (likely enum) | old type | Medium — read/write of chat history |
| `user_memories` | `category` | new type (likely enum) | old type | Medium — memory categorization |
| `users` | `passwordHash` | required, no default | column absent | Low NOW — legacy JWT is disabled (Clerk-only mode); becomes relevant only if legacy password auth is ever re-enabled |

## Why this is NOT a quick fix

- The DB holds **live chat history + 13 real users**. `--force-reset` drops
  everything → unacceptable.
- `role` / `category` type changes need explicit **data-preserving migrations**
  (add new col → backfill with a cast/mapping → swap → drop old), not `db push`.
- `passwordHash` needs either a nullable column, a default, or a backfill
  strategy — decide based on whether legacy auth is ever coming back (currently
  Clerk-only, so likely make it nullable/optional in the schema instead).

## Remediation approach (for the dedicated session)

1. **Back up first:** `pnpm --filter coinet-platform db:backup`.
2. Reconcile each item:
   - `users.passwordHash`: most likely make it **optional/nullable** in
     `schema.prisma` (Clerk-only) rather than backfilling — removes the conflict.
   - `chat_messages.role` & `user_memories.category`: author a real
     `prisma migrate` with an explicit `USING` cast / backfill, or revert the
     schema to the live type if the type change was unintended.
3. Replace the boot-time `db push` with `prisma migrate deploy` so production
   applies versioned migrations instead of silently failing a push.
4. **Fix the false success log:** `scripts/resolve-failed-migration.sh` (or the
   sync wrapper) should surface a non-zero / WARN when push fails, not print
   `✅ Database schema synced`.

## Out of scope / explicitly deferred

- No production DB mutation in this follow-up.
- CryptoPanic 404 (news source) is a separate minor issue, owner handling later.
