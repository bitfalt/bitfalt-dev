#!/bin/sh
set -u
cd "$(dirname "$0")/.."
status=0
for f in tests/*.spec.ts; do
  start=$(date +%s)
  if pnpm exec playwright test "$f" > /tmp/bitfalt-dev-test.log 2>&1; then r=pass; else r=FAIL; status=1; fi
  echo "$r $(basename "$f") $(( $(date +%s) - start ))s $(grep -Eo '[0-9]+ (passed|failed|skipped)' /tmp/bitfalt-dev-test.log | tr '\n' ' ')"
  [ "$r" = FAIL ] && grep -E '✘|Error:' /tmp/bitfalt-dev-test.log | head -20
done
exit $status
