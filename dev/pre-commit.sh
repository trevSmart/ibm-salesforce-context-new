#!/bin/bash
set -e

LITERAL="caixa"
TMP_FILE=$(mktemp)

# Només fitxers staged, evitant el propi script
FILES=$(git diff --cached --name-only | grep -v "dev/pre-commit.sh" || echo "")

if [ -n "$FILES" ]; then
  # Process each file individually to handle filenames with spaces
  FOUND_FORBIDDEN=false
  while IFS= read -r file; do
    if [ -n "$file" ] && [ -f "$file" ]; then
      if grep -H -n -E -i "$LITERAL" "$file" >> "$TMP_FILE" 2>/dev/null; then
        FOUND_FORBIDDEN=true
      fi
    fi
  done <<< "$FILES"
  
  if [ "$FOUND_FORBIDDEN" = true ]; then
    echo
    echo "🚫 Commit bloquejat: trobat el literal prohibit \"$LITERAL\"."
    echo "👀 Detalls:"
    cat "$TMP_FILE"
    rm "$TMP_FILE"
    exit 1
  fi
fi