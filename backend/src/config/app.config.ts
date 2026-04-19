const APPLE_PRODUCT_IDS = ['momentum_monthly', 'momentum_quarterly'] as const;

const APPLE_DEFAULT_ENVIRONMENT = 'Sandbox';
const APPLE_DEFAULT_ROOT_CA_DIR = 'apple-root-certs';

function parseAppAppleId(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface AppleConfig {
  bundleId: string;
  environment: string;
  appAppleId: number | undefined;
  rootCaDir: string;
  productIds: typeof APPLE_PRODUCT_IDS;
}

interface AppleServerApiConfig {
  issuerId: string | undefined;
  keyId: string | undefined;
  privateKey: string | undefined;
}

function readAppleConfig(): AppleConfig {
  const bundleId = process.env.APPLE_BUNDLE_ID ?? '';
  const environment =
    process.env.APPLE_ENVIRONMENT ?? APPLE_DEFAULT_ENVIRONMENT;
  const appAppleId = parseAppAppleId(process.env.APPLE_APP_APPLE_ID);
  const rootCaDir = process.env.APPLE_ROOT_CA_DIR ?? APPLE_DEFAULT_ROOT_CA_DIR;

  if (process.env.NODE_ENV !== 'test' && bundleId === '') {
    throw new Error(
      'APPLE_BUNDLE_ID must be set (got empty string). Set it in your environment (e.g. app.momentum-ai.auth.mobile).',
    );
  }
  if (
    process.env.NODE_ENV !== 'test' &&
    environment === 'Production' &&
    appAppleId === undefined
  ) {
    throw new Error(
      'APPLE_APP_APPLE_ID must be set when APPLE_ENVIRONMENT=Production (numeric App Apple ID from App Store Connect).',
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

export const config = {
  ai: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-3-flash-preview',
    callTimeoutMs: 30_000,
    maxRetries: 3,
    embedding: {
      model: 'text-embedding-3-small',
      dimensions: 1536,
    },
  },
  intake: {
    targetBatches: 5,
    maxBatches: 7,
    questionsPerBatch: { min: 3, max: 5 },
    maxProfileRetries: 3,
    qualityWarnThreshold: 0.5,
    model: 'google/gemini-3-flash-preview',
  },
  eval: {
    judgeModel: 'x-ai/grok-4.1-fast',
  },
  throttle: {
    globalLimit: 60,
    globalTtlMs: 60_000,
    aiEndpointLimit: 10,
    aiEndpointTtlMs: 60_000,
  },
  roadmap: {
    matchCount: 20,
    matchThreshold: 0.7,
    rerankTopN: 10,
    milestoneModel: 'openai/gpt-5.4',
    weeklyModel: 'openai/gpt-5.4',
    weeklyTaskModel: 'openai/gpt-5.4',
    maxGenerationAttempts: 3,
  },
  cohere: {
    apiVersion: '2',
    model: 'rerank-v3.5',
  },
  voice: {
    ttsModelId: 'eleven_flash_v2_5',
    outputFormat: 'mp3_44100_128' as const,
    callTimeoutMs: 30_000,
    maxAudioSizeBytes: 10_485_760,
    supportedInputFormats: [
      'audio/wav',
      'audio/mpeg',
      'audio/mp4',
      'audio/webm',
    ],
  },
  coach: {
    defaultCoachId: 1,
  },
  usage: {
    freeGenerationsPerDay: 20,
    proGenerationsPerDay: 200,
  },
  apns: {
    host: {
      production: 'api.push.apple.com',
      sandbox: 'api.sandbox.push.apple.com',
    },
    jwtCacheTtlMs: 3_300_000,
    broadcastBatchSize: 100,
  },
  chat: {
    model: 'google/gemini-3-flash-preview',
    reasoningEffort: 'high',
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
  },
};
