import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ElevenLabsClient } from "elevenlabs";

import { COACHES, LANGUAGES, type Coach, type Language } from "./coaches.ts";
import { cacheKey } from "./hash.ts";
import { COACH_INTROS, UNIVERSAL_BATCH_1 } from "./texts.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(SCRIPT_DIR, "../../../ios/Momentum/Resources/TTSCache");
const MANIFEST_PATH = resolve(SCRIPT_DIR, "../manifest.json");
const MODEL_ID = "eleven_flash_v2_5";
const OUTPUT_FORMAT = "mp3_44100_128";

interface ManifestEntry {
  key: string;
  coachId: number;
  personality: string;
  language: Language;
  kind: "universal_batch_1" | "coach_intro";
  order?: number;
  text: string;
  bytes: number;
}

async function synthesize(
  client: ElevenLabsClient,
  voiceId: string,
  text: string,
): Promise<Buffer> {
  const stream = await client.textToSpeech.convert(voiceId, {
    text,
    model_id: MODEL_ID,
    output_format: OUTPUT_FORMAT,
  });

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function buildTasks(): Array<{
  coach: Coach;
  language: Language;
  text: string;
  kind: ManifestEntry["kind"];
  order?: number;
}> {
  const tasks: Array<{
    coach: Coach;
    language: Language;
    text: string;
    kind: ManifestEntry["kind"];
    order?: number;
  }> = [];

  for (const coach of COACHES) {
    for (const language of LANGUAGES) {
      const batch = UNIVERSAL_BATCH_1[language];
      batch.forEach((text, index) => {
        tasks.push({
          coach,
          language,
          text,
          kind: "universal_batch_1",
          order: index + 1,
        });
      });

      const intro = COACH_INTROS[coach.id]?.[language];
      if (intro !== undefined) {
        tasks.push({
          coach,
          language,
          text: intro,
          kind: "coach_intro",
        });
      }
    }
  }

  return tasks;
}

async function main(): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (apiKey === undefined || apiKey.length === 0) {
    console.error("ELEVENLABS_API_KEY is required");
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const client = new ElevenLabsClient({ apiKey });
  const tasks = buildTasks();
  const manifest: ManifestEntry[] = [];
  let generated = 0;
  let skipped = 0;

  for (const task of tasks) {
    const key = cacheKey(task.text, task.coach.id, task.language);
    const outPath = resolve(OUTPUT_DIR, `${key}.mp3`);
    const voiceId = task.coach.voiceIds[task.language];

    if (existsSync(outPath)) {
      skipped += 1;
      const bytes = Bun.file(outPath).size;
      manifest.push({
        key,
        coachId: task.coach.id,
        personality: task.coach.personality,
        language: task.language,
        kind: task.kind,
        order: task.order,
        text: task.text,
        bytes,
      });
      continue;
    }

    process.stdout.write(
      `generating ${task.coach.personality}/${task.language}/${task.kind}${task.order !== undefined ? `#${String(task.order)}` : ""} -> ${key}.mp3 ... `,
    );
    const audio = await synthesize(client, voiceId, task.text);
    writeFileSync(outPath, audio);
    generated += 1;
    manifest.push({
      key,
      coachId: task.coach.id,
      personality: task.coach.personality,
      language: task.language,
      kind: task.kind,
      order: task.order,
      text: task.text,
      bytes: audio.length,
    });
    process.stdout.write(`${String(audio.length)} bytes\n`);
  }

  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
  const totalBytes = manifest.reduce((sum, entry) => sum + entry.bytes, 0);
  console.log(
    `\ndone: ${String(generated)} generated, ${String(skipped)} skipped, ${String(manifest.length)} total, ${(totalBytes / 1024 / 1024).toFixed(2)} MB`,
  );
}

await main();
