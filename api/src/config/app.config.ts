const APPLE_PRODUCT_IDS = [
  "milesto_plus_monthly",
  "milesto_plus_annual",
] as const;

const APPLE_DEFAULT_ROOT_CA_DIR = "resources/apple-root-certs";

const PRICE_GEMINI_FLASH_INPUT_PER_1M = 0.075;
const PRICE_GEMINI_FLASH_OUTPUT_PER_1M = 0.3;
const PRICE_GEMINI_FLASH_LITE_INPUT_PER_1M = 0.075;
const PRICE_GEMINI_FLASH_LITE_OUTPUT_PER_1M = 0.3;
const PRICE_GPT_5_5_INPUT_PER_1M = 1.25;
const PRICE_GPT_5_5_OUTPUT_PER_1M = 10;
const PRICE_GROK_4_1_FAST_INPUT_PER_1M = 0.2;
const PRICE_GROK_4_1_FAST_OUTPUT_PER_1M = 0.5;

const MODEL_PRICING: Record<
  string,
  { inputPer1M: number; outputPer1M: number }
> = buildModelPricing([
  [
    "google/gemini-3-flash-preview",
    PRICE_GEMINI_FLASH_INPUT_PER_1M,
    PRICE_GEMINI_FLASH_OUTPUT_PER_1M,
  ],
  [
    "google/gemini-3.1-flash-lite-preview",
    PRICE_GEMINI_FLASH_LITE_INPUT_PER_1M,
    PRICE_GEMINI_FLASH_LITE_OUTPUT_PER_1M,
  ],
  ["openai/gpt-5.5", PRICE_GPT_5_5_INPUT_PER_1M, PRICE_GPT_5_5_OUTPUT_PER_1M],
  [
    "x-ai/grok-4.1-fast",
    PRICE_GROK_4_1_FAST_INPUT_PER_1M,
    PRICE_GROK_4_1_FAST_OUTPUT_PER_1M,
  ],
]);

const SUBSCRIPTION_PRICE_MONTHLY = 4.99;
const SUBSCRIPTION_PRICE_ANNUAL = 39.99;
const QUALITY_FAILURE_THRESHOLD = 0.5;

function parseAppAppleId(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

type AppleEnvironmentName = "Production" | "Xcode";

interface AppleConfig {
  bundleId: string;
  environment: AppleEnvironmentName;
  appAppleId: number | undefined;
  rootCaDir: string;
  productIds: typeof APPLE_PRODUCT_IDS;
}

interface AppleServerApiConfig {
  issuerId: string | undefined;
  keyId: string | undefined;
  privateKey: string | undefined;
}

function parseAppleEnvironment(
  raw: string | undefined,
): AppleEnvironmentName {
  if (raw === "Production" || raw === "Xcode") {
    return raw;
  }
  if (process.env.NODE_ENV === "test") {
    return "Xcode";
  }
  throw new Error(
    `APPLE_ENVIRONMENT must be set to one of Production | Xcode (got ${raw ?? "undefined"}).`,
  );
}

function readAppleConfig(): AppleConfig {
  const bundleId = process.env.APPLE_BUNDLE_ID ?? "";
  const environment = parseAppleEnvironment(process.env.APPLE_ENVIRONMENT);
  const appAppleId = parseAppAppleId(process.env.APPLE_APP_APPLE_ID);
  const rootCaDir = process.env.APPLE_ROOT_CA_DIR ?? APPLE_DEFAULT_ROOT_CA_DIR;

  if (process.env.NODE_ENV !== "test" && bundleId === "") {
    throw new Error(
      "APPLE_BUNDLE_ID must be set (got empty string). Set it in your environment (e.g. app.milesto.auth.mobile).",
    );
  }
  if (
    process.env.NODE_ENV !== "test" &&
    environment === "Production" &&
    appAppleId === undefined
  ) {
    throw new Error(
      "APPLE_APP_APPLE_ID must be set when APPLE_ENVIRONMENT=Production (numeric App Apple ID from App Store Connect).",
    );
  }

  return {
    bundleId,
    environment,
    appAppleId,
    rootCaDir,
    productIds: APPLE_PRODUCT_IDS,
  };
}

function readAppleServerApiConfig(): AppleServerApiConfig {
  return {
    issuerId: process.env.APPLE_ISSUER_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY_P8,
  };
}

function buildModelPricing(
  rows: ReadonlyArray<readonly [string, number, number]>,
): Record<string, { inputPer1M: number; outputPer1M: number }> {
  const map: Record<string, { inputPer1M: number; outputPer1M: number }> = {};
  for (const [model, inputPer1M, outputPer1M] of rows) {
    map[model] = { inputPer1M, outputPer1M };
  }
  return map;
}

export const config = {
  ai: {
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-3-flash-preview",
    callTimeoutMs: 30_000,
    maxRetries: 3,
    embedding: {
      model: "text-embedding-3-small",
      dimensions: 1536,
    },
  },
  intake: {
    targetBatches: 5,
    maxBatches: 7,
    questionsPerBatch: { min: 3, max: 5 },
    maxProfileRetries: 3,
    qualityWarnThreshold: 0.5,
    model: "google/gemini-3-flash-preview",
  },
  eval: {
    judgeModel: "x-ai/grok-4.1-fast",
  },
  throttle: {
    globalLimit: 60,
    globalTtlMs: 60_000,
    aiEndpointLimit: 10,
    aiEndpointTtlMs: 60_000,
    roadmapGenerateLimit: 3,
    weeklyPlanGenerateLimit: 5,
  },
  roadmap: {
    matchCount: 20,
    matchThreshold: 0.7,
    rerankTopN: 10,
    milestoneModel: "openai/gpt-5.5",
    weeklyModel: "openai/gpt-5.5",
    weeklyTaskModel: "openai/gpt-5.5",
    reasoningEffort: "medium",
    maxGenerationAttempts: 3,
    callTimeoutMs: 240_000,
  },
  cohere: {
    apiVersion: "2",
    model: "rerank-v3.5",
  },
  transcription: {
    maxAudioSizeBytes: 10_485_760,
    supportedInputFormats: [
      "audio/wav",
      "audio/mpeg",
      "audio/mp4",
      "audio/webm",
    ],
  },
  coach: {
    defaultCoachId: 1,
  },
  usage: {
    generationsPerDay: 200,
  },
  apns: {
    host: {
      production: "api.push.apple.com",
      sandbox: "api.sandbox.push.apple.com",
    },
    jwtCacheTtlMs: 3_300_000,
    broadcastBatchSize: 100,
  },
  notifications: {
    cronExpression: "*/15 * * * *",
    copyModel: "google/gemini-3.1-flash-lite-preview",
    copyCallTimeoutMs: 15_000,
    maxPerDay: 4,
    minMinutesBetween: 180,
    localWindowStartHour: 9,
    localWindowEndHour: 21,
    maxTitleLength: 50,
    maxBodyLength: 150,
  },
  chat: {
    model: "google/gemini-3-flash-preview",
    reasoningEffort: "high",
    maxToolRounds: 5,
    maxHistoryMessages: 50,
    streamTimeoutMs: 60_000,
    searchMatchCount: 10,
    searchMatchThreshold: 0.5,
    searchResultCount: 5,
    insightDuplicateThreshold: 0.92,
    insightDuplicateCheckCount: 5,
  },
  apple: readAppleConfig(),
  appleServerApi: readAppleServerApiConfig(),
  subscription: {
    webhookThrottleLimit: 300,
    webhookThrottleTtlMs: 60_000,
    webhookMaxBodyBytes: 1_048_576,
    maxFailedDrainAttempts: 5,
    verifyThrottleLimit: 10,
    verifyThrottleTtlMs: 60_000,
  },
  // USD price per subscription product, used by the admin MRR/ARR calculator.
  subscriptionPricing: {
    milesto_plus_monthly: SUBSCRIPTION_PRICE_MONTHLY,
    milesto_plus_annual: SUBSCRIPTION_PRICE_ANNUAL,
  } as Record<string, number>,
  // Per-1M-token USD pricing per OpenRouter model id, used by the admin
  // cost-estimate endpoint. Keep this in sync with OpenRouter as models change.
  // Rows in `generation_usage` whose model is missing from this map are
  // excluded from the cost estimate (reflected via `coverageRatio`).
  modelPricing: MODEL_PRICING,
  // Intake batches with a quality score below this threshold are surfaced as
  // failures in the admin dashboard.
  qualityFailureThreshold: QUALITY_FAILURE_THRESHOLD,
};
