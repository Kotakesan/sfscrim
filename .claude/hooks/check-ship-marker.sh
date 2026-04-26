#!/usr/bin/env bash
# SFScrim — /ship workflow enforcement hook
# Blocks `gh pr create` and `gh pr merge` unless the corresponding
# marker (.simplify-done / .review-approved) was written by /ship.
#
# Markers:
#   .claude/.simplify-done      → required for `gh pr create`
#   .claude/.review-approved    → required for `gh pr merge`
#
# Each marker contains the branch name; checked against current branch
# and TTL. After successful check, marker is consumed (deleted).

set -euo pipefail

# --- read hook input -----------------------------------------------------
input="$(cat)"

# Defensive: only handle Bash tool
tool_name="$(printf '%s' "$input" | jq -r '.tool_name // ""')"
if [ "$tool_name" != "Bash" ]; then
  exit 0
fi

cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"

# --- detect target ------------------------------------------------------
marker=""
action=""
ttl_minutes=0

if printf '%s' "$cmd" | grep -qE '(^|[[:space:]])gh[[:space:]]+pr[[:space:]]+create'; then
  marker=".claude/.simplify-done"
  action="simplify"
  ttl_minutes=10
elif printf '%s' "$cmd" | grep -qE '(^|[[:space:]])gh[[:space:]]+pr[[:space:]]+merge'; then
  marker=".claude/.review-approved"
  action="review (APPROVED)"
  ttl_minutes=30
else
  # not a guarded command
  exit 0
fi

# --- verify marker exists -----------------------------------------------
if [ ! -f "$marker" ]; then
  cat >&2 <<EOF
[BLOCKED] $cmd

Marker not found: $marker
You must run the /ship workflow which executes $action and writes this marker.

Direct \`gh pr create\` / \`gh pr merge\` is disabled to ensure quality gates run.
Use the project-local /ship command instead.
EOF
  exit 2
fi

# --- verify TTL ---------------------------------------------------------
mtime="$(stat -f %m "$marker" 2>/dev/null || stat -c %Y "$marker" 2>/dev/null || echo 0)"
now="$(date +%s)"
age=$(( now - mtime ))
ttl=$(( ttl_minutes * 60 ))
if [ "$age" -gt "$ttl" ]; then
  rm -f "$marker"
  cat >&2 <<EOF
[BLOCKED] $cmd

Marker expired: $marker (age: ${age}s, ttl: ${ttl}s)
Re-run the /ship workflow to refresh.
EOF
  exit 2
fi

# --- verify branch matches ----------------------------------------------
recorded_branch="$(cat "$marker" 2>/dev/null | head -n1 | tr -d '[:space:]')"
current_branch="$(git symbolic-ref --short HEAD 2>/dev/null || echo "")"
if [ -z "$recorded_branch" ] || [ -z "$current_branch" ]; then
  cat >&2 <<EOF
[BLOCKED] $cmd

Could not determine branch (recorded: '$recorded_branch', current: '$current_branch').
Re-run the /ship workflow.
EOF
  exit 2
fi
if [ "$recorded_branch" != "$current_branch" ]; then
  cat >&2 <<EOF
[BLOCKED] $cmd

Marker is for branch '$recorded_branch' but current branch is '$current_branch'.
Switch back to the correct branch or re-run /ship.
EOF
  exit 2
fi

# --- consume marker and pass through ------------------------------------
rm -f "$marker"
exit 0
