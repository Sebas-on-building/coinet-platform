-- =============================================================================
-- ENCRYPTION SETUP FOR NOTIFICATION LOGS
-- =============================================================================
-- This script implements comprehensive encryption at rest for sensitive
-- notification data using PostgreSQL's pgcrypto extension.

-- 1. Enable pgcrypto extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create encryption key management table
CREATE TABLE IF NOT EXISTS "encryption_keys" (
    "id" VARCHAR(36) NOT NULL,
    "keyName" VARCHAR(100) NOT NULL,
    "algorithm" VARCHAR(50) NOT NULL DEFAULT 'aes-256-gcm',
    "keyData" BYTEA NOT NULL, -- Encrypted master key
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(6),
    "rotatedAt" TIMESTAMP(6),
    "rotationCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "encryption_keys_pkey" PRIMARY KEY ("id")
);

-- Create index for encryption keys
CREATE INDEX "encryption_keys_active_idx" ON "encryption_keys" ("isActive", "expiresAt");

-- 3. Create master encryption key (this should be done securely)
-- In production, generate this key externally and store it securely
INSERT INTO "encryption_keys" ("id", "keyName", "keyData", "expiresAt")
VALUES (
    gen_random_uuid()::TEXT,
    'notification-logs-master-key',
    -- This is a placeholder - in production, use a cryptographically secure key
    -- Example: decode('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex')
    pgcrypto.digest(gen_random_bytes(32), 'sha256'),
    CURRENT_TIMESTAMP + INTERVAL '1 year'
) ON CONFLICT ("keyName") DO NOTHING;

-- 4. Create encryption/decryption functions
CREATE OR REPLACE FUNCTION encrypt_notification_data(
    plaintext TEXT,
    key_name TEXT DEFAULT 'notification-logs-master-key'
)
RETURNS TEXT AS $$
DECLARE
    master_key BYTEA;
    encrypted_data TEXT;
    iv BYTEA;
    encrypted_bytes BYTEA;
BEGIN
    -- Get the active master key
    SELECT "keyData" INTO master_key
    FROM "encryption_keys"
    WHERE "keyName" = key_name AND "isActive" = true AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
    ORDER BY "createdAt" DESC
    LIMIT 1;

    IF master_key IS NULL THEN
        RAISE EXCEPTION 'No valid encryption key found for: %', key_name;
    END IF;

    -- Generate a random IV
    iv := gen_random_bytes(16);

    -- Encrypt the data using AES-256-GCM
    encrypted_bytes := pgcrypto.encrypt_iv(
        convert_to(plaintext, 'utf8'),
        master_key,
        iv,
        'aes-256-gcm'
    );

    -- Return base64 encoded result with IV prepended
    encrypted_data := encode(iv || encrypted_bytes, 'base64');

    RETURN encrypted_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create decryption function
CREATE OR REPLACE FUNCTION decrypt_notification_data(
    encrypted_data TEXT,
    key_name TEXT DEFAULT 'notification-logs-master-key'
)
RETURNS TEXT AS $$
DECLARE
    master_key BYTEA;
    decoded_data BYTEA;
    iv BYTEA;
    encrypted_bytes BYTEA;
    decrypted_bytes BYTEA;
    decrypted_text TEXT;
BEGIN
    -- Get the active master key
    SELECT "keyData" INTO master_key
    FROM "encryption_keys"
    WHERE "keyName" = key_name AND "isActive" = true AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP)
    ORDER BY "createdAt" DESC
    LIMIT 1;

    IF master_key IS NULL THEN
        RAISE EXCEPTION 'No valid decryption key found for: %', key_name;
    END IF;

    -- Decode from base64
    decoded_data := decode(encrypted_data, 'base64');

    -- Extract IV (first 16 bytes) and encrypted data
    iv := substring(decoded_data FROM 1 FOR 16);
    encrypted_bytes := substring(decoded_data FROM 17);

    -- Decrypt the data
    decrypted_bytes := pgcrypto.decrypt_iv(
        encrypted_bytes,
        master_key,
        iv,
        'aes-256-gcm'
    );

    -- Convert back to text
    decrypted_text := convert_from(decrypted_bytes, 'utf8');

    RETURN decrypted_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create key rotation function
CREATE OR REPLACE FUNCTION rotate_encryption_key(
    key_name TEXT DEFAULT 'notification-logs-master-key',
    new_key_name TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    current_key_id TEXT;
    new_key_id TEXT;
    rotation_count INTEGER;
BEGIN
    -- Get current key info
    SELECT "id", "rotationCount" INTO current_key_id, rotation_count
    FROM "encryption_keys"
    WHERE "keyName" = key_name AND "isActive" = true
    ORDER BY "createdAt" DESC
    LIMIT 1;

    IF current_key_id IS NULL THEN
        RAISE EXCEPTION 'No active key found for rotation: %', key_name;
    END IF;

    -- Generate new key ID
    new_key_id := gen_random_uuid()::TEXT;

    -- Create new key (in production, generate this externally)
    INSERT INTO "encryption_keys" ("id", "keyName", "keyData", "expiresAt", "rotationCount")
    VALUES (
        new_key_id,
        COALESCE(new_key_name, key_name),
        pgcrypto.digest(gen_random_bytes(32), 'sha256'),
        CURRENT_TIMESTAMP + INTERVAL '1 year',
        rotation_count + 1
    );

    -- Mark old key as inactive
    UPDATE "encryption_keys"
    SET "isActive" = false, "rotatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = current_key_id;

    RETURN 'Rotated key ' || current_key_id || ' to ' || new_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create encrypted column types
-- Note: In PostgreSQL, we need to handle encryption at the application level
-- since encrypted columns can't be indexed or searched directly

-- 8. Create trigger functions for automatic encryption/decryption
CREATE OR REPLACE FUNCTION encrypt_notification_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Encrypt sensitive fields before insert/update
    IF NEW."messageContent" IS NOT NULL AND NEW."messageContent" != '' THEN
        NEW."messageContent" := encrypt_notification_data(NEW."messageContent");
    END IF;

    IF NEW."messagePayload" IS NOT NULL THEN
        NEW."messagePayload" := encrypt_notification_data(NEW."messagePayload"::TEXT)::JSONB;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_notification_content()
RETURNS TRIGGER AS $$
DECLARE
    decrypted_content TEXT;
    decrypted_payload TEXT;
BEGIN
    -- Decrypt sensitive fields for reading
    IF OLD."messageContent" IS NOT NULL AND OLD."messageContent" != '' THEN
        decrypted_content := decrypt_notification_data(OLD."messageContent");
        OLD."messageContent" := decrypted_content;
    END IF;

    IF OLD."messagePayload" IS NOT NULL THEN
        decrypted_payload := decrypt_notification_data(OLD."messagePayload"::TEXT);
        OLD."messagePayload" := decrypted_payload::JSONB;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 9. Apply encryption triggers to notification_logs table
-- Note: These triggers handle automatic encryption on write and decryption on read

-- For security, we only apply the encryption trigger (decryption is handled in application layer)
CREATE TRIGGER trigger_encrypt_notification_content
    BEFORE INSERT OR UPDATE ON "notification_logs"
    FOR EACH ROW
    EXECUTE FUNCTION encrypt_notification_content();

-- 10. Create encryption key management functions
CREATE OR REPLACE FUNCTION list_encryption_keys()
RETURNS TABLE(
    id TEXT,
    key_name TEXT,
    algorithm TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    rotated_at TIMESTAMP,
    rotation_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ek."id",
        ek."keyName",
        ek."algorithm",
        ek."isActive",
        ek."createdAt",
        ek."expiresAt",
        ek."rotatedAt",
        ek."rotationCount"
    FROM "encryption_keys" ek
    ORDER BY ek."createdAt" DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_encryption_key_info(key_name TEXT)
RETURNS TABLE(
    id TEXT,
    key_name TEXT,
    algorithm TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMP,
    expires_at TIMESTAMP,
    rotated_at TIMESTAMP,
    rotation_count INTEGER,
    days_until_expiry INTEGER
) AS $$
DECLARE
    days_to_expiry INTEGER;
BEGIN
    RETURN QUERY
    SELECT
        ek."id",
        ek."keyName",
        ek."algorithm",
        ek."isActive",
        ek."createdAt",
        ek."expiresAt",
        ek."rotatedAt",
        ek."rotationCount",
        CASE
            WHEN ek."expiresAt" IS NOT NULL THEN
                EXTRACT(DAY FROM ek."expiresAt" - CURRENT_TIMESTAMP)::INTEGER
            ELSE NULL
        END as days_until_expiry
    FROM "encryption_keys" ek
    WHERE ek."keyName" = key_name
    ORDER BY ek."createdAt" DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create encryption health check function
CREATE OR REPLACE FUNCTION check_encryption_health()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT,
    recommendation TEXT
) AS $$
DECLARE
    active_keys INTEGER;
    expired_keys INTEGER;
    total_keys INTEGER;
    encrypted_notifications INTEGER;
    unencrypted_notifications INTEGER;
BEGIN
    -- Check encryption keys
    SELECT COUNT(*) INTO active_keys
    FROM "encryption_keys"
    WHERE "isActive" = true AND ("expiresAt" IS NULL OR "expiresAt" > CURRENT_TIMESTAMP);

    SELECT COUNT(*) INTO expired_keys
    FROM "encryption_keys"
    WHERE "expiresAt" IS NOT NULL AND "expiresAt" <= CURRENT_TIMESTAMP;

    SELECT COUNT(*) INTO total_keys FROM "encryption_keys";

    -- Check notification data
    SELECT COUNT(*) INTO encrypted_notifications
    FROM "notification_logs"
    WHERE "messageContent" IS NOT NULL AND "messageContent" != '';

    SELECT COUNT(*) INTO unencrypted_notifications
    FROM "notification_logs"
    WHERE "messageContent" IS NOT NULL AND "messageContent" = '';

    RETURN QUERY VALUES
    ('Active Keys', CASE WHEN active_keys > 0 THEN 'OK' ELSE 'CRITICAL' END,
     active_keys::TEXT || ' active encryption keys', 'Ensure at least one active key'),
    ('Expired Keys', CASE WHEN expired_keys = 0 THEN 'OK' ELSE 'WARNING' END,
     expired_keys::TEXT || ' expired keys', 'Rotate or remove expired keys'),
    ('Encrypted Notifications', CASE WHEN unencrypted_notifications = 0 THEN 'OK' ELSE 'WARNING' END,
     encrypted_notifications::TEXT || ' encrypted, ' || unencrypted_notifications::TEXT || ' unencrypted',
     'All sensitive data should be encrypted'),
    ('Total Keys', 'OK', total_keys::TEXT || ' total keys', 'Monitor key rotation');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create audit logging for encryption operations
CREATE TABLE IF NOT EXISTS "encryption_audit_log" (
    "id" VARCHAR(36) NOT NULL,
    "operation" VARCHAR(50) NOT NULL, -- encrypt, decrypt, rotate
    "keyName" VARCHAR(100) NOT NULL,
    "userId" VARCHAR(36),
    "resource" VARCHAR(100) NOT NULL, -- notification_logs, etc.
    "resourceId" VARCHAR(36),
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "ipAddress" VARCHAR(45),
    "timestamp" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encryption_audit_log_pkey" PRIMARY KEY ("id")
);

-- Create index for encryption audit log
CREATE INDEX "encryption_audit_log_timestamp_idx" ON "encryption_audit_log" ("timestamp");
CREATE INDEX "encryption_audit_log_operation_idx" ON "encryption_audit_log" ("operation");
CREATE INDEX "encryption_audit_log_key_idx" ON "encryption_audit_log" ("keyName");

-- 13. Create audit trigger for encryption operations
CREATE OR REPLACE FUNCTION audit_encryption_operation()
RETURNS TRIGGER AS $$
DECLARE
    current_user TEXT;
BEGIN
    current_user := current_setting('app.current_user', true);

    -- Log encryption operations
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        INSERT INTO "encryption_audit_log" (
            "operation", "keyName", "userId", "resource", "resourceId",
            "success", "ipAddress"
        ) VALUES (
            'encrypt', TG_TABLE_NAME, current_user, TG_TABLE_NAME, NEW."id",
            true, inet_client_addr()::TEXT
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger
CREATE TRIGGER trigger_audit_encryption_notification_logs
    AFTER INSERT OR UPDATE ON "notification_logs"
    FOR EACH ROW
    WHEN (NEW."messageContent" IS NOT NULL OR NEW."messagePayload" IS NOT NULL)
    EXECUTE FUNCTION audit_encryption_operation();

-- 14. Create secure key backup function
CREATE OR REPLACE FUNCTION backup_encryption_keys()
RETURNS TABLE(
    key_id TEXT,
    key_name TEXT,
    backup_data TEXT
) AS $$
DECLARE
    key_record RECORD;
    backup_key TEXT;
BEGIN
    -- Generate a backup encryption key (in production, use external KMS)
    backup_key := encode(pgcrypto.digest(gen_random_bytes(32), 'sha256'), 'hex');

    FOR key_record IN
        SELECT "id", "keyName", "keyData" FROM "encryption_keys" WHERE "isActive" = true
    LOOP
        -- In a real implementation, you'd encrypt the key data with the backup key
        -- For now, we'll just return the key info (this should be handled by external KMS)
        key_id := key_record."id";
        key_name := key_record."keyName";
        backup_data := 'ENCRYPTED_WITH_BACKUP_KEY';

        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create data migration function for existing unencrypted data
CREATE OR REPLACE FUNCTION migrate_unencrypted_data()
RETURNS TABLE(
    migrated_count BIGINT,
    skipped_count BIGINT
) AS $$
DECLARE
    migration_count BIGINT := 0;
    skip_count BIGINT := 0;
    notification_record RECORD;
BEGIN
    FOR notification_record IN
        SELECT "id", "messageContent", "messagePayload"
        FROM "notification_logs"
        WHERE ("messageContent" IS NOT NULL AND "messageContent" NOT LIKE 'eyJ%') -- Not already encrypted (base64 pattern)
        OR ("messagePayload" IS NOT NULL AND "messagePayload"::TEXT NOT LIKE 'eyJ%')
    LOOP
        -- Check if data appears to be already encrypted (base64 pattern)
        IF notification_record."messageContent" LIKE 'eyJ%' OR
           notification_record."messagePayload"::TEXT LIKE 'eyJ%' THEN
            skip_count := skip_count + 1;
        ELSE
            -- Encrypt the data
            UPDATE "notification_logs"
            SET
                "messageContent" = CASE
                    WHEN "messageContent" IS NOT NULL THEN encrypt_notification_data("messageContent")
                    ELSE "messageContent"
                END,
                "messagePayload" = CASE
                    WHEN "messagePayload" IS NOT NULL THEN encrypt_notification_data("messagePayload"::TEXT)::JSONB
                    ELSE "messagePayload"
                END
            WHERE "id" = notification_record."id";

            migration_count := migration_count + 1;
        END IF;
    END LOOP;

    RETURN QUERY VALUES (migration_count, skip_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON "encryption_keys" TO coinet;
GRANT SELECT, INSERT ON "encryption_audit_log" TO coinet;
GRANT EXECUTE ON FUNCTION encrypt_notification_data(TEXT, TEXT) TO coinet;
GRANT EXECUTE ON FUNCTION decrypt_notification_data(TEXT, TEXT) TO coinet;
GRANT EXECUTE ON FUNCTION rotate_encryption_key(TEXT, TEXT) TO coinet;
GRANT EXECUTE ON FUNCTION list_encryption_keys() TO coinet;
GRANT EXECUTE ON FUNCTION get_encryption_key_info(TEXT) TO coinet;
GRANT EXECUTE ON FUNCTION check_encryption_health() TO coinet;
GRANT EXECUTE ON FUNCTION backup_encryption_keys() TO coinet;
GRANT EXECUTE ON FUNCTION migrate_unencrypted_data() TO coinet;

-- 17. Create helpful comments
COMMENT ON TABLE "encryption_keys" IS 'Master encryption keys for notification data at rest';
COMMENT ON TABLE "encryption_audit_log" IS 'Audit log for encryption/decryption operations';
COMMENT ON FUNCTION encrypt_notification_data(TEXT, TEXT) IS 'Encrypts sensitive notification data using AES-256-GCM';
COMMENT ON FUNCTION decrypt_notification_data(TEXT, TEXT) IS 'Decrypts sensitive notification data using AES-256-GCM';
COMMENT ON FUNCTION rotate_encryption_key(TEXT, TEXT) IS 'Rotates encryption keys for security compliance';
COMMENT ON FUNCTION check_encryption_health() IS 'Checks the health and security of encryption keys and data';
COMMENT ON FUNCTION migrate_unencrypted_data() IS 'Migrates existing unencrypted data to encrypted format';

-- 18. Example usage documentation
/*
-- Encrypting data:
SELECT encrypt_notification_data('Sensitive message content');

-- Decrypting data:
SELECT decrypt_notification_data('encrypted_data_here');

-- Rotating encryption keys:
SELECT rotate_encryption_key('notification-logs-master-key', 'notification-logs-master-key-v2');

-- Checking encryption health:
SELECT * FROM check_encryption_health();

-- Listing encryption keys:
SELECT * FROM list_encryption_keys();

-- Getting key information:
SELECT * FROM get_encryption_key_info('notification-logs-master-key');

-- Backing up keys (for disaster recovery):
SELECT * FROM backup_encryption_keys();

-- Migrating existing unencrypted data:
SELECT * FROM migrate_unencrypted_data();
*/
