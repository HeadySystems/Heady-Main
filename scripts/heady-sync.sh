#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  HEADY CROSS-DEVICE SYNC
#  Manual + Automatic bidirectional git sync across all devices
#
#  Usage:
#    ./scripts/heady-sync.sh              # Manual one-shot sync
#    ./scripts/heady-sync.sh --auto       # Silent auto mode (for systemd)
#    ./scripts/heady-sync.sh --status     # Show sync health
#    ./scripts/heady-sync.sh --watch      # Continuous sync loop (5 min)
#    ./scripts/heady-sync.sh --dry-run    # Show what would happen
#
#  © 2026 Heady™Systems Inc. All rights reserved.
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCKFILE="/tmp/heady-sync.lock"
LOG_DIR="$REPO_ROOT/logs"
LOG_FILE="$LOG_DIR/heady-sync.log"
WATCH_INTERVAL=300  # 5 minutes in seconds
DEVICE_NAME="$(hostname -s 2>/dev/null || echo 'unknown')"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"

# Remotes to push to (primary first, then mirrors)
# Auto-detected from git remote, filtered to push targets
PRIMARY_REMOTE="headyai"
PUSH_REMOTES=("headyai" "hc-main" "hs-main")

# ─── Color Helpers ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ─── Globals ──────────────────────────────────────────────────────
MODE="manual"
DRY_RUN=false
SYNC_ERRORS=0

# ─── Parse Arguments ─────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --auto)     MODE="auto"; shift ;;
        --status)   MODE="status"; shift ;;
        --watch)    MODE="watch"; shift ;;
        --dry-run)  DRY_RUN=true; shift ;;
        --help|-h)
            echo "Usage: heady-sync.sh [--auto|--status|--watch|--dry-run]"
            echo ""
            echo "  (no args)   Manual one-shot sync"
            echo "  --auto      Silent auto mode (for systemd/cron)"
            echo "  --status    Show sync health overview"
            echo "  --watch     Continuous sync loop every 5 minutes"
            echo "  --dry-run   Show what would happen without doing it"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ─── Logging ──────────────────────────────────────────────────────
mkdir -p "$LOG_DIR"

log() {
    local level="$1"
    shift
    local msg="[$TIMESTAMP] [$DEVICE_NAME] [$level] $*"
    if [[ "$MODE" == "auto" ]]; then
        echo "$msg" >> "$LOG_FILE"
    else
        case "$level" in
            INFO)  echo -e "${GREEN}✓${NC} $*" ;;
            WARN)  echo -e "${YELLOW}⚠${NC} $*" ;;
            ERROR) echo -e "${RED}✗${NC} $*" ;;
            STEP)  echo -e "${CYAN}→${NC} ${BOLD}$*${NC}" ;;
            HEAD)  echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"
                   echo -e " ${BOLD}$*${NC}"
                   echo -e "${CYAN}═══════════════════════════════════════════════════${NC}" ;;
        esac
        echo "$msg" >> "$LOG_FILE"
    fi
}

# ─── Lockfile Guard ───────────────────────────────────────────────
acquire_lock() {
    if [[ -f "$LOCKFILE" ]]; then
        local lock_pid
        lock_pid="$(cat "$LOCKFILE" 2>/dev/null || echo "")"
        if [[ -n "$lock_pid" ]] && kill -0 "$lock_pid" 2>/dev/null; then
            log WARN "Another sync is running (PID $lock_pid). Skipping."
            exit 0
        else
            log WARN "Stale lockfile found. Cleaning up."
            rm -f "$LOCKFILE"
        fi
    fi
    echo $$ > "$LOCKFILE"
    trap 'rm -f "$LOCKFILE"' EXIT INT TERM
}

release_lock() {
    rm -f "$LOCKFILE"
}

# ─── Status Mode ──────────────────────────────────────────────────
show_status() {
    echo -e "\n${CYAN}═══ HEADY SYNC STATUS ═══${NC}\n"

    echo -e "${BOLD}Device:${NC}         $DEVICE_NAME"
    echo -e "${BOLD}Repository:${NC}     $REPO_ROOT"
    echo -e "${BOLD}Branch:${NC}         $(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
    echo -e "${BOLD}Last Commit:${NC}    $(git -C "$REPO_ROOT" log -1 --format='%h %s (%cr)' 2>/dev/null || echo 'none')"
    echo ""

    # Check remote sync status
    echo -e "${BOLD}Remote Status:${NC}"
    local branch
    branch="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'main')"
    local local_sha
    local_sha="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo 'unknown')"

    for remote in $(git -C "$REPO_ROOT" remote 2>/dev/null); do
        local remote_sha
        remote_sha="$(git -C "$REPO_ROOT" ls-remote "$remote" "refs/heads/$branch" 2>/dev/null | cut -f1 || echo 'unreachable')"
        if [[ "$remote_sha" == "$local_sha" ]]; then
            echo -e "  ${GREEN}✓${NC} $remote — in sync"
        elif [[ -z "$remote_sha" || "$remote_sha" == "unreachable" ]]; then
            echo -e "  ${YELLOW}?${NC} $remote — unreachable or branch missing"
        else
            echo -e "  ${RED}✗${NC} $remote — out of sync (remote: ${remote_sha:0:7})"
        fi
    done
    echo ""

    # Check lockfile
    if [[ -f "$LOCKFILE" ]]; then
        echo -e "${YELLOW}⚠${NC}  Sync lock active (PID $(cat "$LOCKFILE" 2>/dev/null))"
    else
        echo -e "${GREEN}✓${NC}  No active sync lock"
    fi

    # Check systemd timer
    if systemctl --user is-active heady-sync.timer &>/dev/null; then
        echo -e "${GREEN}✓${NC}  Auto-sync timer: ACTIVE"
        systemctl --user list-timers heady-sync.timer --no-pager 2>/dev/null | tail -2
    else
        echo -e "${YELLOW}○${NC}  Auto-sync timer: INACTIVE"
        echo "     Enable with: systemctl --user enable --now heady-sync.timer"
    fi

    # Last sync from log
    if [[ -f "$LOG_FILE" ]]; then
        local last_sync
        last_sync="$(grep -oP '\[\K[0-9-]+ [0-9:]+' "$LOG_FILE" | tail -1)"
        echo -e "${BOLD}Last sync:${NC}      ${last_sync:-never}"
    fi

    # Dirty state
    local dirty_count
    dirty_count="$(git -C "$REPO_ROOT" status --short 2>/dev/null | wc -l)"
    if [[ "$dirty_count" -gt 0 ]]; then
        echo -e "${YELLOW}⚠${NC}  $dirty_count uncommitted change(s)"
    else
        echo -e "${GREEN}✓${NC}  Working tree clean"
    fi

    echo ""
}

# ─── Core Sync Logic ─────────────────────────────────────────────
do_sync() {
    local branch
    branch="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'main')"

    log HEAD "HEADY SYNC — $DEVICE_NAME — $(date '+%Y-%m-%d %H:%M:%S')"

    # Step 1: Fetch all remotes
    log STEP "Fetching all remotes..."
    if $DRY_RUN; then
        log INFO "[DRY-RUN] Would run: git fetch --all --prune"
    else
        if git -C "$REPO_ROOT" fetch --all --prune 2>&1; then
            log INFO "Fetched all remotes"
        else
            log WARN "Some remotes failed to fetch (continuing)"
        fi
    fi

    # Step 2: Pull LFS objects
    if command -v git-lfs &>/dev/null; then
        log STEP "Pulling LFS objects..."
        if $DRY_RUN; then
            log INFO "[DRY-RUN] Would run: git lfs pull"
        else
            git -C "$REPO_ROOT" lfs pull 2>&1 || log WARN "LFS pull had issues (non-fatal)"
        fi
    fi

    # Step 3: Stash dirty working tree
    local had_stash=false
    local dirty_count
    dirty_count="$(git -C "$REPO_ROOT" status --short 2>/dev/null | wc -l)"

    if [[ "$dirty_count" -gt 0 ]]; then
        log STEP "Stashing $dirty_count uncommitted change(s)..."
        if $DRY_RUN; then
            log INFO "[DRY-RUN] Would stash $dirty_count changes"
        else
            if git -C "$REPO_ROOT" stash push --include-untracked -m "heady-sync auto-stash $TIMESTAMP" 2>&1; then
                had_stash=true
                log INFO "Changes stashed"
            else
                log WARN "Stash failed — working tree may be empty or conflicted"
            fi
        fi
    else
        log INFO "Working tree clean — no stash needed"
    fi

    # Step 4: Rebase on remote
    log STEP "Rebasing on $PRIMARY_REMOTE/$branch..."
    if $DRY_RUN; then
        log INFO "[DRY-RUN] Would run: git pull --rebase $PRIMARY_REMOTE $branch"
    else
        if ! git -C "$REPO_ROOT" pull --rebase "$PRIMARY_REMOTE" "$branch" 2>&1; then
            log ERROR "Rebase failed! Checking for conflicts..."

            # Check if we're in a rebase
            if [[ -d "$REPO_ROOT/.git/rebase-merge" || -d "$REPO_ROOT/.git/rebase-apply" ]]; then
                log ERROR "CONFLICT DETECTED during rebase. Aborting rebase to preserve state."
                git -C "$REPO_ROOT" rebase --abort 2>&1 || true
                SYNC_ERRORS=$((SYNC_ERRORS + 1))

                # Pop stash back if we stashed
                if $had_stash; then
                    git -C "$REPO_ROOT" stash pop 2>&1 || true
                fi

                log ERROR "Manual intervention required: resolve conflicts and re-run sync."
                return 1
            fi
        else
            log INFO "Rebased successfully"
        fi
    fi

    # Step 5: Pop stash
    if $had_stash; then
        log STEP "Restoring stashed changes..."
        if $DRY_RUN; then
            log INFO "[DRY-RUN] Would pop stash"
        else
            if ! git -C "$REPO_ROOT" stash pop 2>&1; then
                log ERROR "Stash pop had conflicts! Your changes are in 'git stash list'."
                SYNC_ERRORS=$((SYNC_ERRORS + 1))
            else
                log INFO "Stash restored"
            fi
        fi
    fi

    # Step 6: Auto-commit any uncommitted changes
    dirty_count="$(git -C "$REPO_ROOT" status --short 2>/dev/null | wc -l)"
    if [[ "$dirty_count" -gt 0 ]]; then
        log STEP "Auto-committing $dirty_count change(s)..."
        if $DRY_RUN; then
            log INFO "[DRY-RUN] Would auto-commit $dirty_count files"
        else
            git -C "$REPO_ROOT" add -A 2>&1
            local commit_msg="heady-sync: auto-commit from $DEVICE_NAME [$(date '+%Y-%m-%d %H:%M')]"
            if git -C "$REPO_ROOT" commit -m "$commit_msg" --no-verify 2>&1; then
                log INFO "Auto-committed: $commit_msg"
            else
                log WARN "Nothing to commit after add (already clean)"
            fi
        fi
    fi

    # Step 7: Push to all configured remotes
    log STEP "Pushing to remotes..."
    for remote in "${PUSH_REMOTES[@]}"; do
        # Verify remote exists
        if ! git -C "$REPO_ROOT" remote | grep -qx "$remote"; then
            log WARN "Remote '$remote' not configured — skipping"
            continue
        fi

        if $DRY_RUN; then
            log INFO "[DRY-RUN] Would push to $remote/$branch"
        else
            if git -C "$REPO_ROOT" push "$remote" "$branch" 2>&1; then
                log INFO "Pushed to $remote"
            else
                log WARN "Push to $remote failed (may need force or auth)"
                SYNC_ERRORS=$((SYNC_ERRORS + 1))
            fi
        fi
    done

    # Summary
    if [[ $SYNC_ERRORS -eq 0 ]]; then
        log HEAD "SYNC COMPLETE — All clear ✓"
    else
        log HEAD "SYNC COMPLETE — $SYNC_ERRORS warning(s)"
    fi

    return 0
}

# ─── Watch Mode (Continuous Loop) ────────────────────────────────
do_watch() {
    log HEAD "HEADY SYNC WATCH MODE — syncing every ${WATCH_INTERVAL}s"
    log INFO "Press Ctrl+C to stop"

    while true; do
        TIMESTAMP="$(date '+%Y-%m-%d %H:%M:%S')"
        SYNC_ERRORS=0
        do_sync || true
        log INFO "Next sync in ${WATCH_INTERVAL}s..."
        sleep "$WATCH_INTERVAL"
    done
}

# ─── Main Entry Point ────────────────────────────────────────────
cd "$REPO_ROOT"

case "$MODE" in
    status)
        show_status
        ;;
    watch)
        acquire_lock
        do_watch
        ;;
    auto)
        acquire_lock
        do_sync
        ;;
    manual)
        acquire_lock
        do_sync
        ;;
esac

exit $SYNC_ERRORS
