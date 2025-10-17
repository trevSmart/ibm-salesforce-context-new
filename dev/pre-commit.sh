#!/bin/bash
set -e

LITERAL="caixa"
TMP_FILE=$(mktemp)

# Només fitxers staged, evitant el propi script
FILES=$(git diff --cached --name-only | grep -v "dev/pre-commit.sh" || true)

if [ -n "$FILES" ]; then
  if grep -H -n -E -i "$LITERAL" $FILES > "$TMP_FILE"; then
    echo
    echo "🚫 Commit bloquejat: trobat el literal prohibit \"$LITERAL\"."
    echo "👀 Detalls:"
    cat "$TMP_FILE"
    rm "$TMP_FILE"
    exit 1
  fi
fi