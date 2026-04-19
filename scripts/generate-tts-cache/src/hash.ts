import { createHash } from "node:crypto";

import type { Language } from "./coaches.ts";

export function cacheKey(
  text: string,
  coachId: number,
  language: Language,
): string {
  const input = `${text}|${coachId}|${language}`;
  const digest = createHash("sha256").update(input).digest("hex");
  return digest.slice(0, 16);
}
