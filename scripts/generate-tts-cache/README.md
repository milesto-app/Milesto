# generate-tts-cache

Standalone script that pre-generates ElevenLabs TTS audio for bundling into the iOS app. Fully external from `backend/` — no imports from the NestJS codebase. Safe to run repeatedly; already-generated files are skipped.

## What it generates

For each of the 4 coaches × 2 languages (EN/FR):
- 5 universal Batch 1 intake questions (from `src/texts.ts`)
- 1 short coach intro phrase (from `src/texts.ts`, edit before running if you want different wording)

Files land in `ios/Momentum/Resources/TTSCache/<sha256-16-hex>.mp3`. A `scripts/generate-tts-cache/manifest.json` (git-ignored) is also written, mapping every key back to its source text for debugging. The manifest lives outside `Resources/` so it doesn't ship in the app bundle.

## Cache key

`sha256("<text>|<coachId>|<language>")` truncated to the first 16 hex chars. The same scheme runs on iOS (`TTSCacheService`), so bundled lookups and runtime-cache lookups share one code path.

## Run it

```bash
cd scripts/generate-tts-cache
bun install
ELEVENLABS_API_KEY=sk-... bun run generate
```

Re-running is idempotent — only missing files are re-synthesized.

## When to re-run

- Added a new coach, new language, or new question text
- Edited a coach intro in `src/texts.ts`
- Rotated a voice ID in `src/coaches.ts`

If you change an existing text string, a new hash is produced; the old MP3 remains in `Resources/TTSCache/` but is no longer reachable via the cache key. Delete stale MP3s manually (compare against `manifest.json`) if bundle size matters.

## Audio format

ElevenLabs Flash v2.5, `mp3_44100_128` (MP3 @ 44.1 kHz, 128 kbps). Matches what `backend/src/voice/voice-tts.service.ts` requests at runtime so bundled and server-generated audio sound identical.
