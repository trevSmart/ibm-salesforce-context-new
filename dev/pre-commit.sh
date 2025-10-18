#!/bin/bash
set -e

LITERAL="caixa"
TMP_FILE=$(mktemp)

# Només fitxers staged, evitant el propi script i els workflows
FILES=$(git diff --cached --name-only | grep -F -v "dev/pre-commit.sh" | grep -F -v ".github/workflows/push-checks.yml" | grep -F -v ".github/workflows/pr-checks.yml" || true)

if [ -n "$FILES" ]; then
  > "$TMP_FILE"
  found=0
  while IFS= read -r file; do
    if grep -H -n -E -i "$LITERAL" "$file" >> "$TMP_FILE"; then
      found=1
    fi
  done <<< "$FILES"
  if [ "$found" -eq 1 ]; then
    echo
    echo "🚫 Commit bloquejat: trobat el literal prohibit \"$LITERAL\"."
    echo "👀 Detalls:"
    cat "$TMP_FILE"
    rm "$TMP_FILE"
    exit 1
  fi
fi