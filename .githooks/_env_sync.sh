#!/usr/bin/env sh
# Shared POSIX helper for MediAssist-AI git hooks (vault backup/restore).
# Keep Unix LF (\n) line endings for Git for Windows (/bin/sh).

VAULT_DIR="$HOME/.mediassist"
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

sync_pair_backup() {
    src="$1"
    dst="$2"
    if [ -s "$src" ]; then
        mkdir -p "$(dirname "$dst")"
        cp "$src" "$dst"
    fi
}

sync_pair_restore() {
    vault_src="$1"
    local_dst="$2"
    if [ -s "$vault_src" ] && [ ! -s "$local_dst" ]; then
        mkdir -p "$(dirname "$local_dst")"
        cp "$vault_src" "$local_dst"
    fi
}

backup_all() {
    sync_pair_backup "$REPO_ROOT/.env" "$VAULT_DIR/.env"
    sync_pair_backup "$REPO_ROOT/backend/.env" "$VAULT_DIR/backend.env"
    sync_pair_backup "$REPO_ROOT/backend/src/main/resources/application-local.properties" "$VAULT_DIR/application-local.properties"
    sync_pair_backup "$REPO_ROOT/frontend/.env" "$VAULT_DIR/frontend.env"
}

restore_all() {
    sync_pair_restore "$VAULT_DIR/.env" "$REPO_ROOT/.env"
    sync_pair_restore "$VAULT_DIR/backend.env" "$REPO_ROOT/backend/.env"
    sync_pair_restore "$VAULT_DIR/application-local.properties" "$REPO_ROOT/backend/src/main/resources/application-local.properties"
    sync_pair_restore "$VAULT_DIR/frontend.env" "$REPO_ROOT/frontend/.env"

    if [ -d "$REPO_ROOT/backend/target/classes" ] && [ -s "$REPO_ROOT/backend/src/main/resources/application-local.properties" ]; then
        cp "$REPO_ROOT/backend/src/main/resources/application-local.properties" \
            "$REPO_ROOT/backend/target/classes/application-local.properties"
    fi
}
