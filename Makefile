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

test: test-api
test-api: ; bun run --cwd api test

unused: unused-ios unused-api unused-web
unused-ios: ; cd ios && periphery scan --project Milesto.xcodeproj --schemes Milesto --strict --retain-codable-properties --retain-assign-only-properties --retain-files 'Milesto/Sources/Shared/Components/TablerIcons.swift' -- CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO ENABLE_PREVIEWS=NO ONLY_ACTIVE_ARCH=YES ARCHS="$$(uname -m)"
unused-api: ; npx -y knip --directory api
unused-web: ; npx -y knip --directory web

SUPABASE_PROJECT_REF ?= yhjcpncfftyhtqnnqong
gen-types:
	npx -y supabase gen types typescript --project-id $(SUPABASE_PROJECT_REF) --schema public > api/src/supabase/database.types.ts.tmp
	mv api/src/supabase/database.types.ts.tmp api/src/supabase/database.types.ts
	cp api/src/supabase/database.types.ts web/src/lib/supabase/database.types.ts
	bunx prettier --write --log-level warn api/src/supabase/database.types.ts web/src/lib/supabase/database.types.ts

dev-api:   ; bun run --cwd api start:dev
dev-web:   ; bun run --cwd web dev

clean:
	rm -rf api/dist api/node_modules web/.next web/node_modules
