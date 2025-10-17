#!/bin/bash
set -e

if git diff --cached | grep -qi "LITERAL_PROHIBIT"; then
  echo "🚫 Commit bloquejat: trobat el literal prohibit (sense distingir majúscules/minúscules)."
  exit 1
fi