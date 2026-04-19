import {
  COPY_GEN_ERROR_CODE,
  COPY_OUTPUT_BODY_MAX,
  COPY_OUTPUT_TITLE_MAX,
  validateRaw,
} from "./validators.js";

const CLEAN_OPTIONS = { language: "en" as const, suppressStreakCopy: false };

describe("validateRaw", () => {
  it("should return status='generated' with no errorCode on clean output", () => {
    const raw = JSON.stringify({
      title: "Ready?",
      body: "Today's plan is two short tasks.",
    });
    const result = validateRaw(raw, CLEAN_OPTIONS);
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.errorCode).toBeUndefined();
      expect(result.output).toEqual({
        title: "Ready?",
        body: "Today's plan is two short tasks.",
      });
    }
  });

  it("should set errorCode='parse_error' when JSON is malformed", () => {
    const result = validateRaw("not json", CLEAN_OPTIONS);
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.errorCode).toBe(COPY_GEN_ERROR_CODE.PARSE_ERROR);
    }
  });

  it("should set errorCode='parse_error' when a required field is missing", () => {
    const raw = JSON.stringify({ title: "Hi" });
    const result = validateRaw(raw, CLEAN_OPTIONS);
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.errorCode).toBe(COPY_GEN_ERROR_CODE.PARSE_ERROR);
    }
  });

  it("should set errorCode='parse_error' when title is empty after trim", () => {
    const raw = JSON.stringify({ title: "   ", body: "ok" });
    const result = validateRaw(raw, CLEAN_OPTIONS);
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.errorCode).toBe(COPY_GEN_ERROR_CODE.PARSE_ERROR);
    }
  });

  it("should clamp overlong title and body and flag errorCode='truncated' non-fatally", () => {
    const overlongTitle = "A".repeat(COPY_OUTPUT_TITLE_MAX + 10);
    const overlongBody = "B".repeat(COPY_OUTPUT_BODY_MAX + 20);
    const raw = JSON.stringify({ title: overlongTitle, body: overlongBody });
    const result = validateRaw(raw, CLEAN_OPTIONS);
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.errorCode).toBe(COPY_GEN_ERROR_CODE.TRUNCATED);
      expect(result.output.title.length).toBe(COPY_OUTPUT_TITLE_MAX);
      expect(result.output.body.length).toBe(COPY_OUTPUT_BODY_MAX);
    }
  });

  it("should set errorCode='banned_phrase' when output contains a banned stem", () => {
    const raw = JSON.stringify({
      title: "Hey",
      body: "We miss you. Check in.",
    });
    const result = validateRaw(raw, CLEAN_OPTIONS);
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.errorCode).toBe(COPY_GEN_ERROR_CODE.BANNED_PHRASE);
    }
  });

  it("should set errorCode='streak_mention_forbidden' when suppressStreakCopy=true and output mentions a streak", () => {
    const raw = JSON.stringify({
      title: "Today",
      body: "Keep your streak alive with one task.",
    });
    const result = validateRaw(raw, {
      language: "en",
      suppressStreakCopy: true,
    });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.errorCode).toBe(
        COPY_GEN_ERROR_CODE.STREAK_MENTION_FORBIDDEN,
      );
    }
  });

  it("should return status='generated' when streak is mentioned but suppressStreakCopy=false", () => {
    const raw = JSON.stringify({
      title: "Nice",
      body: "Your streak is healthy — keep it light today.",
    });
    const result = validateRaw(raw, {
      language: "en",
      suppressStreakCopy: false,
    });
    expect(result.status).toBe("generated");
  });

  it("should return errorCode='banned_phrase' for French parasocial patterns", () => {
    const raw = JSON.stringify({
      title: "Coucou",
      body: "Tu nous manques sur le plan.",
    });
    const result = validateRaw(raw, {
      language: "fr",
      suppressStreakCopy: false,
    });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.errorCode).toBe(COPY_GEN_ERROR_CODE.BANNED_PHRASE);
    }
  });
});
