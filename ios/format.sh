#!/bin/bash
set -euo pipefail

if ! command -v swiftlint &>/dev/null; then
  echo "swiftlint not found. Install with: brew install swiftlint"
  exit 1
fi

if ! command -v swiftformat &>/dev/null; then
  echo "swiftformat not found. Install with: brew install swiftformat"
  exit 1
fi

cd "$(dirname "$0")"

EXCLUDES=(
  "Momentum/Sources/Shared/Components/TablerIcons.swift"
)

trap 'rm -f .swiftlint.yml' EXIT
{
  echo "excluded:"
  for path in "${EXCLUDES[@]}"; do
    echo "  - $path"
  done
  echo "disabled_rules:"
  echo "  - trailing_comma"
  echo "  - opening_brace"
} > .swiftlint.yml

SWIFTFORMAT_EXCLUDES=()
for path in "${EXCLUDES[@]}"; do
  SWIFTFORMAT_EXCLUDES+=(--exclude "$path")
done

swiftlint lint --fix .
swiftformat --verbose --swiftversion 5 "${SWIFTFORMAT_EXCLUDES[@]}" .
