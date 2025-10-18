#!/bin/bash
set -e

LITERAL="caixa"
TMP_FILE=$(mktemp)

# Només fitxers staged, evitant el propi script i els workflows
FILES=$(git diff --cached --name-only | grep -v "dev/pre-commit.sh" | grep -v ".github/workflows/" || echo "")

if [ -n "$FILES" ]; then
  if echo "$FILES" | tr '\n' '\0' | xargs -0 grep -H -n -E -i "$LITERAL" > "$TMP_FILE" 2>/dev/null; then
    echo
    echo "🚫 Commit bloquejat: trobat el literal prohibit \"$LITERAL\"."
    echo "👀 Detalls:"
    cat "$TMP_FILE"
    rm "$TMP_FILE"
    exit 1
  fi
fi