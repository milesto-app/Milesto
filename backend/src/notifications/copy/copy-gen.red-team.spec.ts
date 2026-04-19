// Red-team spec for the copy-gen service (M2.9.2).
//
// Drives every fixture in __fixtures__/red-team/bad-outputs.ts through
// the real CopyGenService with a stubbed CopyGenClient that returns
// the fixture's worst-case raw output on both attempts of the retry
// ladder. Asserts the service surfaces the correct error_code for
// every fixture — this is the regression wall for the validator.
//
// Also covers the happy side (HAPPY_OUTPUT_FIXTURES) to confirm the
// same pipeline accepts clean output.

import { BAD_OUTPUT_FIXTURES } from "./__fixtures__/red-team/bad-outputs.js";
import { HAPPY_OUTPUT_FIXTURES } from "./__fixtures__/red-team/happy-outputs.js";
import type { ClientCallResult } from "./copy-gen.client.js";
import type { CopyGenClient } from "./copy-gen.client.js";
import type { CopyGenJobContext } from "./copy-gen.service.js";
import { CopyGenService } from "./copy-gen.service.js";
import type { SupportedLanguage } from "./fallbacks.js";

function buildContext(overrides: {
  language: SupportedLanguage;
  suppressStreakCopy: boolean;
}): CopyGenJobContext {
  return {
    jobId: "job-red-team",
    kind: "daily_check_in",
    language: overrides.language,
    coachId: 1,
    stub: { title: "Coach", teaser: "Ready for today's plan?" },
    memoryHooks: {},
    kindSpecific: {},
    suppressStreakCopy: overrides.suppressStreakCopy,
    inputHash: "hash",
    attemptNo: 1,
  };
}

function okResult(raw: string): ClientCallResult {
  return { ok: true, rawContent: raw, providerStatus: 200, latencyMs: 42 };
}

function buildClient(raw: string): CopyGenClient {
  const client: Partial<CopyGenClient> = {
    call: jest.fn().mockResolvedValue(okResult(raw)),
  };
  return client as CopyGenClient;
}

describe("CopyGenService red-team", () => {
  describe.each(BAD_OUTPUT_FIXTURES.map((fx) => [fx.name, fx]))(
    "rejects %s",
    (_name, fixture) => {
      it(`returns status='failed' with errorCode='${fixture.expectedErrorCode}'`, async () => {
        const client = buildClient(fixture.rawOutput);
        const service = new CopyGenService(client);
        const context = buildContext({
          language: fixture.language,
          suppressStreakCopy: fixture.suppressStreakCopy,
        });

        const result = await service.generate(context);

        expect(result.status).toBe("failed");
        expect(result.errorCode).toBe(fixture.expectedErrorCode);
      });
    },
  );

  describe.each(HAPPY_OUTPUT_FIXTURES.map((fx) => [fx.name, fx]))(
    "accepts %s",
    (_name, fixture) => {
      it("returns status='generated' with output", async () => {
        const client = buildClient(fixture.rawOutput);
        const service = new CopyGenService(client);
        const context = buildContext({
          language: fixture.language,
          suppressStreakCopy: fixture.suppressStreakCopy,
        });

        const result = await service.generate(context);

        expect(result.status).toBe("generated");
        expect(result.output).toBeDefined();
        expect(result.output?.title.length).toBeGreaterThan(0);
        expect(result.output?.body.length).toBeGreaterThan(0);
      });
    },
  );
});
