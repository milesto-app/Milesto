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

EXCLUDE="Momentum/Core/Components/TablerIconCatalog.swift"

trap 'rm -f .swiftlint.yml' EXIT
cat > .swiftlint.yml <<YAML
excluded:
  - $EXCLUDE
disabled_rules:
  - trailing_comma
  - opening_brace
YAML

swiftlint lint --fix .
swiftformat --swiftversion 5 --exclude "$EXCLUDE" .
