// Snapshot tests for the 8 canonical system prompts (M2.9.2).
//
// Snapshots pin the exact prompt text so inadvertent edits trigger a
// review step. When you intentionally edit a prompt, bump its
// `promptVersion` in system-prompts.ts at the same time — the
// generation row records the version, so analytics can correlate
// regressions with prompt changes.

import { SUPPORTED_LANGUAGES } from "../fallbacks.js";
import { buildStrictSystemPrompt } from "./strict-prompt.js";
import {
  allSystemPrompts,
  COACH_PERSONALITIES,
  getSystemPrompt,
} from "./system-prompts.js";

describe("system prompts", () => {
  it("should define exactly 4 personalities × 2 languages = 8 prompts", () => {
    expect(allSystemPrompts()).toHaveLength(
      COACH_PERSONALITIES.length * SUPPORTED_LANGUAGES.length,
    );
  });

  describe.each(
    COACH_PERSONALITIES.flatMap((personality) =>
      SUPPORTED_LANGUAGES.map((language) => [personality, language] as const),
    ),
  )("%s × %s", (personality, language) => {
    const prompt = getSystemPrompt(personality, language);

    it("should expose a non-empty promptVersion", () => {
      expect(prompt.promptVersion.length).toBeGreaterThan(0);
    });

    it("should match the pinned system-prompt snapshot", () => {
      expect(prompt.text).toMatchSnapshot();
    });

    it("should match the pinned strict-retry snapshot", () => {
      expect(buildStrictSystemPrompt(prompt)).toMatchSnapshot();
    });
  });
});
