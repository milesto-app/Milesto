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
    milestoneModel: 'default',
    weeklyModel: 'default',
    weeklyTaskModel: 'default',
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
    sessionDurationMs: 840_000,
    sessionWarningMs: 780_000,
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
    reasoningEffort: 'low',
    maxToolRounds: 5,
    maxHistoryMessages: 50,
    streamTimeoutMs: 60_000,
    searchMatchCount: 10,
    searchMatchThreshold: 0.5,
    searchResultCount: 5,
    insightDuplicateThreshold: 0.92,
    insightDuplicateCheckCount: 5,
  },
};
