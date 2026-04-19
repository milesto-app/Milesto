// Unit tests for CopyGenService (M2.9.2) — retry ladder, budget, and
// per-(kind × persona × language) grid. The red-team spec covers the
// validator-rejection path comprehensively; here we pin down the
// orchestration semantics.

import { config } from "../../config/app.config.js";
import type { ClientCallResult } from "./copy-gen.client.js";
import type { CopyGenClient } from "./copy-gen.client.js";
import type { CopyGenJobContext } from "./copy-gen.service.js";
import { CopyGenService } from "./copy-gen.service.js";
import { SUPPORTED_LANGUAGES } from "./fallbacks.js";
import { COACH_PERSONALITIES } from "./prompts/system-prompts.js";
import type { CopyGenErrorCode } from "./validators.js";
import { COPY_GEN_ERROR_CODE } from "./validators.js";

const COACH_ID_BY_PERSONALITY: Readonly<Record<string, number>> = {
  motivateur: 1,
  zen: 2,
  strict: 3,
  complice: 4,
};

function okResult(raw: string, latencyMs = 42): ClientCallResult {
  return { ok: true, rawContent: raw, providerStatus: 200, latencyMs };
}

function failResult(
  errorCode: CopyGenErrorCode,
  providerStatus: number | null = null,
): ClientCallResult {
  return {
    ok: false,
    errorCode,
    reason: "test-failure",
    providerStatus,
    latencyMs: 12,
  };
}

interface MockClientState {
  readonly calls: jest.Mock<Promise<ClientCallResult>, [unknown]>;
}

function buildClient(sequence: readonly ClientCallResult[]): {
  client: CopyGenClient;
  state: MockClientState;
} {
  const mock = jest.fn<Promise<ClientCallResult>, [unknown]>();
  for (const result of sequence) {
    mock.mockResolvedValueOnce(result);
  }
  const client: Partial<CopyGenClient> = { call: mock };
  return {
    client: client as CopyGenClient,
    state: { calls: mock },
  };
}

function buildContext(
  overrides: Partial<CopyGenJobContext> = {},
): CopyGenJobContext {
  return {
    jobId: "job-1",
    kind: "daily_check_in",
    language: "en",
    coachId: 1,
    stub: { title: "Coach", teaser: "Ready?" },
    memoryHooks: {},
    kindSpecific: {},
    suppressStreakCopy: false,
    inputHash: "hash",
    attemptNo: 1,
    ...overrides,
  };
}

const HAPPY_RAW = JSON.stringify({
  title: "Ready?",
  body: "Today's plan is two short tasks.",
});

const BANNED_RAW = JSON.stringify({
  title: "Hey",
  body: "We miss you. Come back.",
});

describe("CopyGenService", () => {
  describe("happy path", () => {
    it("should return status='generated' with output and personality after one clean attempt", async () => {
      const { client, state } = buildClient([okResult(HAPPY_RAW)]);
      const service = new CopyGenService(client);

      const result = await service.generate(buildContext({ coachId: 2 }));

      expect(result.status).toBe("generated");
      expect(result.output).toBeDefined();
      expect(result.personality).toBe("zen");
      expect(result.attemptsUsed).toBe(1);
      expect(state.calls).toHaveBeenCalledTimes(1);
    });

    it("should use the fallback personality when coachId is null", async () => {
      const { client } = buildClient([okResult(HAPPY_RAW)]);
      const service = new CopyGenService(client);

      const result = await service.generate(buildContext({ coachId: null }));

      expect(result.status).toBe("generated");
      expect(result.personality).toBe("motivateur");
    });
  });

  describe("retry ladder", () => {
    it("should retry with strict prompt when first attempt is a banned phrase and succeed on second", async () => {
      const { client, state } = buildClient([
        okResult(BANNED_RAW),
        okResult(HAPPY_RAW),
      ]);
      const service = new CopyGenService(client);

      const result = await service.generate(buildContext());

      expect(result.status).toBe("generated");
      expect(result.attemptsUsed).toBe(2);
      expect(state.calls).toHaveBeenCalledTimes(2);
      const secondCallArgs = state.calls.mock.calls[1]?.[0] as {
        systemPrompt: string;
      };
      expect(secondCallArgs.systemPrompt).toMatch(/STRICT RETRY/);
    });

    it("should fail with banned_phrase after two failed attempts", async () => {
      const { client } = buildClient([
        okResult(BANNED_RAW),
        okResult(BANNED_RAW),
      ]);
      const service = new CopyGenService(client);

      const result = await service.generate(buildContext());

      expect(result.status).toBe("failed");
      expect(result.errorCode).toBe(COPY_GEN_ERROR_CODE.BANNED_PHRASE);
      expect(result.attemptsUsed).toBe(2);
    });

    it("should retry after parse_error and succeed on second attempt", async () => {
      const { client } = buildClient([
        okResult("not json"),
        okResult(HAPPY_RAW),
      ]);
      const service = new CopyGenService(client);

      const result = await service.generate(buildContext());

      expect(result.status).toBe("generated");
      expect(result.attemptsUsed).toBe(2);
    });
  });

  describe("client-layer failures", () => {
    it("should stop retrying and surface http_error without using second attempt", async () => {
      const { client, state } = buildClient([
        failResult(COPY_GEN_ERROR_CODE.HTTP_ERROR, 502),
      ]);
      const service = new CopyGenService(client);

      const result = await service.generate(buildContext());

      expect(result.status).toBe("failed");
      expect(result.errorCode).toBe(COPY_GEN_ERROR_CODE.HTTP_ERROR);
      expect(state.calls).toHaveBeenCalledTimes(1);
    });

    it("should retry once after a timeout and surface timeout when second attempt also times out", async () => {
      const { client, state } = buildClient([
        failResult(COPY_GEN_ERROR_CODE.TIMEOUT),
        failResult(COPY_GEN_ERROR_CODE.TIMEOUT),
      ]);
      const service = new CopyGenService(client);

      const result = await service.generate(buildContext());

      expect(result.status).toBe("failed");
      expect(result.errorCode).toBe(COPY_GEN_ERROR_CODE.TIMEOUT);
      expect(state.calls).toHaveBeenCalledTimes(2);
    });
  });

  describe("wall-clock budget", () => {
    it("should abort before the second attempt when the wall-clock budget is exhausted", async () => {
      // Simulate wall-clock progression via Date.now spy. Sequence:
      //   t=0     deadline=0+budget set by service
      //   t=0     first attempt reads Date.now() in pre-check (< deadline)
      //   t=0     first attempt records latency via client, returns BANNED
      //   t=T+1   second-attempt pre-check reads Date.now() → >= deadline
      const timeline = [0, 0, config.copyGen.totalBudgetMs + 1];
      const nowSpy = jest.spyOn(Date, "now");
      for (const t of timeline) {
        nowSpy.mockReturnValueOnce(t);
      }
      nowSpy.mockReturnValue(config.copyGen.totalBudgetMs + 1);

      const { client, state } = buildClient([okResult(BANNED_RAW)]);
      const service = new CopyGenService(client);

      const result = await service.generate(buildContext());

      expect(result.status).toBe("failed");
      expect(result.errorCode).toBe(COPY_GEN_ERROR_CODE.BUDGET_EXCEEDED);
      expect(state.calls).toHaveBeenCalledTimes(1);
      nowSpy.mockRestore();
    });
  });

  describe("suppressStreakCopy", () => {
    it("should fail with streak_mention_forbidden when suppressStreakCopy=true", async () => {
      const streakRaw = JSON.stringify({
        title: "Today",
        body: "Keep your streak alive.",
      });
      const { client } = buildClient([
        okResult(streakRaw),
        okResult(streakRaw),
      ]);
      const service = new CopyGenService(client);

      const result = await service.generate(
        buildContext({ suppressStreakCopy: true }),
      );

      expect(result.status).toBe("failed");
      expect(result.errorCode).toBe(
        COPY_GEN_ERROR_CODE.STREAK_MENTION_FORBIDDEN,
      );
    });
  });

  describe("per-(kind × personality × language) grid", () => {
    const KINDS = [
      "daily_check_in",
      "milestone_preview",
      "streak_at_risk",
    ] as const;

    const combos = KINDS.flatMap((kind) =>
      COACH_PERSONALITIES.flatMap((personality) =>
        SUPPORTED_LANGUAGES.map((language) => ({
          kind,
          personality,
          language,
        })),
      ),
    );

    describe.each(combos)(
      "kind=$kind personality=$personality language=$language",
      ({ kind, personality, language }) => {
        it("should accept a clean output for this triplet", async () => {
          const raw =
            language === "en"
              ? JSON.stringify({
                  title: "Today",
                  body: "Two short tasks — quick scan before bed.",
                })
              : JSON.stringify({
                  title: "Aujourd'hui",
                  body: "Deux petites tâches — un coup d'œil rapide.",
                });
          const { client } = buildClient([okResult(raw)]);
          const service = new CopyGenService(client);

          const result = await service.generate(
            buildContext({
              kind,
              language,
              coachId: COACH_ID_BY_PERSONALITY[personality],
            }),
          );

          expect(result.status).toBe("generated");
          expect(result.personality).toBe(personality);
        });
      },
    );
  });
});
