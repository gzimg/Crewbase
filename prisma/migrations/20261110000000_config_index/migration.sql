-- Speeds up settings and Team/HR lookups: these always filter config rows by workspace and key.
CREATE INDEX IF NOT EXISTS "config_workspaceGroupId_key_idx" ON "config"("workspaceGroupId", "key");
