#!/bin/bash
set -e

if git diff --cached | grep -qi --color=always "caixa"; then
  echo "🚫 Commit blocked because it contains a forbidden literal."
  exit 1
fi