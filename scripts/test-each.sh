#!/bin/sh
set -u
cd "$(dirname "$0")/.."
logs=test-results/logs
rm -rf "$logs"
mkdir -p "$logs"
status=0
for f in tests/*.spec.ts; do
  name=$(basename "$f" .spec.ts)
  log="$logs/$name.log"
  start=$(date +%s)
  if pnpm exec playwright test "$f" --trace retain-on-failure --output "test-results/$name" > "$log" 2>&1; then r=pass; else r=FAIL; status=1; fi
  echo "$r $(basename "$f") $(( $(date +%s) - start ))s $(grep -Eo '[0-9]+ (passed|failed|skipped|flaky)' "$log" | tr '\n' ' ')"
  if [ "$r" = FAIL ]; then
    grep -E '✘|Error:' "$log" | head -20
    echo "  full log: $log"
  else
    rm -f "$log"
  fi
done
exit $status
