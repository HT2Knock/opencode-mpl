#!/usr/bin/env bash
# comment-count: self
# Count leading comment lines in tracked source files.
#
# The number is a ratchet, not a linter: it only has to stay stable between
# runs. Full-line comments and leading block-comment lines count. Trailing
# comments and markers inside strings do not, so the count can be slightly low
# but never noisy.
#
# Usage: comment-count.sh [--write] [--baseline=FILE] [PATH...]
#   --write        store the current count as the baseline
#   --baseline=F   baseline file (default: .comment-ratchet)
#   PATH           files or directories; default: all tracked files
#
# Add one shell glob per line to .comment-ignore to skip generated paths.

set -euo pipefail

baseline=.comment-ratchet
write=0
paths=()

for arg in "$@"; do
  case "$arg" in
    --write) write=1 ;;
    --baseline=*) baseline=${arg#--baseline=} ;;
    --help|-h)
      awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); if ($0 == "comment-count: self") next; print; next } NR > 1 { exit }' "$0"
      exit 0
      ;;
    *) paths+=("$arg") ;;
  esac
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "comment-count: run this inside a git repository" >&2
  exit 2
fi

comment_regex() {
  local file=$1 name ext
  name=$(basename "$file")
  ext=${file##*.}
  [ "$ext" = "$file" ] && ext=

  case "$name" in
    Dockerfile|Makefile|Gemfile|Rakefile|Vagrantfile) echo '^[[:space:]]*#'; return ;;
  esac

  case "$ext" in
    ts|tsx|js|jsx|mjs|cjs|go|rs|java|kt|kts|swift|c|h|cc|cpp|hpp|cs|scala|dart|php|css|scss|less)
      echo '^[[:space:]]*(//|/[*]|[*]|[{]?/[*])' ;;
    py|sh|bash|zsh|rb|yaml|yml|toml|r|pl|ex|exs|jl|tf|hcl|nix|cmake)
      echo '^[[:space:]]*#' ;;
    sql|lua|hs|elm|ada)
      echo '^[[:space:]]*--' ;;
    html|htm|xml|vue|svelte|md|svg)
      echo '^[[:space:]]*<!--' ;;
    *) echo '' ;;
  esac
}

count_file() {
  local file=$1 re
  re=$(comment_regex "$file")
  [ -n "$re" ] || { echo 0; return; }
  awk -v re="$re" '$0 ~ re && $0 !~ /^#!/ { n++ } END { print n + 0 }' "$file"
}

ignore_file=.comment-ignore
ignore=
[ -f "$ignore_file" ] && ignore=$(cat "$ignore_file")

total=0
files=0

if [ "${#paths[@]}" -gt 0 ]; then
  list=$(git ls-files -- "${paths[@]}")
else
  list=$(git ls-files)
fi

while IFS= read -r file; do
  [ -n "$file" ] || continue
  [ -f "$file" ] || continue
  grep -q 'comment-count: self' "$file" 2>/dev/null && continue
  if [ -n "$ignore" ]; then
    skip=0
    while IFS= read -r pattern; do
      [ -n "$pattern" ] || continue
      case "$pattern" in '#'*) continue ;; esac
      # Intentional glob match; the pattern is user input.
      # shellcheck disable=SC2254
      case "$file" in $pattern) skip=1 ;; esac
    done <<EOF
$ignore
EOF
    [ "$skip" = 1 ] && continue
  fi
  n=$(count_file "$file")
  [ "$n" -gt 0 ] || continue
  total=$((total + n))
  files=$((files + 1))
done <<EOF
$list
EOF

if [ "$write" = 1 ]; then
  if [ "${#paths[@]}" -gt 0 ]; then
    echo "comment ratchet: --write counts the whole repository; drop the paths" >&2
    exit 2
  fi
  printf '%s\n' "$total" >"$baseline"
  echo "comment ratchet: baseline set to $total ($files files)"
  exit 0
fi

if [ "${#paths[@]}" -gt 0 ]; then
  echo "comment ratchet: $total comment lines in $files files"
  exit 0
fi

if [ ! -f "$baseline" ]; then
  echo "comment ratchet: no $baseline; current count is $total ($files files)"
  echo "Run this script with --write and commit $baseline to start the ratchet."
  exit 0
fi

previous=$(tr -d '[:space:]' <"$baseline")
: "${previous:=0}"

if [ "$total" -gt "$previous" ]; then
  echo "comment ratchet failed: $total comment lines, baseline $previous (+$((total - previous)))" >&2
  echo "Delete the new comment, or move its reason to an ADR." >&2
  echo "If the rise is legitimate, run this script with --write and commit $baseline." >&2
  exit 1
fi

if [ "$total" -lt "$previous" ]; then
  echo "comment ratchet: $total comment lines, down from $previous"
  echo "Lower the baseline: run this script with --write."
  exit 0
fi

echo "comment ratchet: $total comment lines, unchanged"
