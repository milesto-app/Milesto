NPROC := $(shell sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 4)
MAKEFLAGS += -j$(NPROC) --output-sync=line

install: install-api install-web
install-api: ; bun install --cwd api
install-web: ; bun install --cwd web

update: update-api update-web
update-api: ; cd api && bun update --latest
update-web: ; cd web && bun update --latest

build: build-api build-web
build-api: ; bun run --cwd api build
build-web: ; bun run --cwd web build

lint: lint-ios lint-api lint-web lint-prettier
lint-ios:
	cd ios && swiftformat --quiet \
	  --exclude Milesto/Sources/Shared/Components/TablerIcons.swift .
lint-api:      ; bun run --cwd api lint
lint-web:      ; bun run --cwd web lint
lint-prettier: ; bunx prettier --write --ignore-unknown --log-level warn .

dev-api:   ; bun run --cwd api start:dev
dev-web:   ; bun run --cwd web dev

clean:
	rm -rf api/dist api/node_modules web/.next web/node_modules
