# Unit Economics Simulation

Date: 2026-04-28.

Base country: France.

This is a planning model, not measured production usage. Replace the assumptions with real token logs once billing telemetry is available.

Operational fixed costs are intentionally excluded. This document models only variable provider cost per paying user.

## Pricing Inputs

Recommended app pricing from `docs/pricing.md`:

| Plan    |    Customer price | Net proceeds after 20% VAT + 15% Apple commission |
| ------- | ----------------: | ------------------------------------------------: |
| Monthly | `14,99 € / month` |                          `10,62 € / user / month` |
| Annual  |  `89,99 € / year` |       `5,31 € / user / month`, recognized monthly |

Blended ARPU assumption: **30% monthly / 70% annual**.

Blended net proceeds: **6,90 € / user / month**.

## Provider Cost Inputs

Current code uses:

- OpenRouter `google/gemini-3-flash-preview` for chat and default JSON generation
- OpenRouter `google/gemini-3.1-flash-lite-preview` for notification copy
- OpenRouter/OpenAI-compatible `openai/gpt-5.5` for roadmap, weekly plan, and weekly tasks
- OpenAI `text-embedding-3-small` for embeddings
- Cohere `rerank-v3.5` for reranking
- ElevenLabs `scribe_v2` for voice transcription

Reference prices checked:

- OpenRouter Gemini 3 Flash Preview: `$0.50 / 1M input`, `$3.00 / 1M output`
- OpenRouter Gemini 3.1 Flash Lite Preview: `$0.25 / 1M input`, `$1.50 / 1M output`
- OpenRouter / OpenAI GPT-5.5: `$5.00 / 1M input`, `$30.00 / 1M output`
- OpenAI `text-embedding-3-small`: `$0.02 / 1M input tokens`
- ElevenLabs Scribe v1/v2: `$0.22 / hour`
- Cohere Rerank: modeled at `$0.002 / search` until actual invoice pricing is known

FX assumption: `1 USD = 0,86 EUR`.

## Practical Pessimistic User Cost

This scenario assumes an active paying user, but not someone intentionally abusing the daily cap.

| Usage               | Assumption                                                      |    Cost |
| ------------------- | --------------------------------------------------------------- | ------: |
| Chat                | 3 messages/day, 6k input + 800 output, 1.3x agent/tool overhead | `$0.63` |
| Weekly planning     | 2 GPT-5.5 calls/week, 10k input + 1.5k output each              | `$0.76` |
| Replanning          | 1 GPT-5.5 roadmap refresh/month                                 | `$0.14` |
| Onboarding/profile  | Amortized model calls                                           | `$0.10` |
| Embeddings + rerank | Context assembly/search buffer                                  | `$0.05` |
| Voice transcription | 10 minutes/month                                                | `$0.04` |

Practical pessimistic variable cost: **`$1.72` / user / month**, or **`1,50 €` / user / month**.

This is the better headline planning number. The previous `6,72 €` estimate assumed much heavier daily chat, larger context, and more expensive planning usage than most users should generate.

## Benefit Simulation

Uses blended net proceeds of `6,90 € / user / month` and practical pessimistic variable cost of `1,50 € / user / month`.

| Paying users | Net revenue | Variable cost | Estimated benefit |
| -----------: | ----------: | ------------: | ----------------: |
|           10 |      `69 €` |        `15 €` |            `54 €` |
|           50 |     `345 €` |        `75 €` |           `270 €` |
|          100 |     `690 €` |       `150 €` |           `540 €` |
|          500 |   `3 452 €` |       `750 €` |         `2 702 €` |
|        1 000 |   `6 904 €` |     `1 500 €` |         `5 404 €` |
|        5 000 |  `34 519 €` |     `7 500 €` |        `27 019 €` |
|       10 000 |  `69 037 €` |    `15 000 €` |        `54 037 €` |

## Plan Mix Sensitivity

Same `1,50 € / user / month` variable cost.

| Paying users | Monthly-only benefit | Annual-only recognized benefit |
| -----------: | -------------------: | -----------------------------: |
|           10 |               `91 €` |                         `38 €` |
|           50 |              `456 €` |                        `191 €` |
|          100 |              `912 €` |                        `381 €` |
|          500 |            `4 559 €` |                      `1 906 €` |
|        1 000 |            `9 118 €` |                      `3 812 €` |
|        5 000 |           `45 590 €` |                     `19 060 €` |
|       10 000 |           `91 179 €` |                     `38 119 €` |

## Stress Case

The real risk is not normal usage. The risk is cap-abuse or accidentally allowing expensive actions to count the same as cheap chat.

Stress-case assumptions:

- 10 chat messages/day
- 12k input + 1.5k output per chat
- 1.5x agent/tool overhead
- 2 large GPT-5.5 planning calls/week
- 30 minutes voice/month

Stress-case variable cost: **`6,72 € / user / month`**.

At that level, annual pricing becomes very thin and the blended plan barely clears variable cost. This should be treated as a guardrail warning, not the expected cost per user.

The theoretical cap-abuse case is much worse: `200` chat messages/day can exceed `80 €` variable cost per user/month, and `200` GPT-5.5 planning calls/day is completely uneconomic.

## Conclusion

The practical pessimistic cost per active paying user is closer to **`1,50 € / month`**, not `6,72 €`.

The pricing recommendation still works if usage is managed:

- Monthly at `14,99 €` has strong margin.
- Annual at `89,99 €` is acceptable if average usage stays near the practical pessimistic model.
- The app should not offer unlimited GPT-5.5 planning calls under one shared daily cap.

Recommended guardrails:

- Add type-specific usage limits instead of one shared `200 generations/day` cap.
- Put stricter caps on GPT-5.5 roadmap/planning calls than on Gemini chat.
- Cache/reuse weekly plan context where possible.
- Track input tokens, output tokens, model, feature, user id, and estimated cost for every AI call.
- Review real P50/P90/P99 cost per paying user before finalizing pricing.

## Sources

- OpenRouter model pricing API: https://openrouter.ai/api/v1/models
- OpenRouter Gemini 3 Flash Preview: https://openrouter.ai/google/gemini-3-flash-preview/pricing
- OpenRouter Gemini 3.1 Flash Lite Preview: https://openrouter.ai/google/gemini-3.1-flash-lite-preview
- OpenRouter GPT-5.5: https://openrouter.ai/openai/gpt-5.5/apps
- OpenAI API pricing: https://platform.openai.com/docs/pricing
- ElevenLabs API pricing: https://elevenlabs.io/pricing/api
- Apple Small Business Program: https://developer.apple.com/app-store/small-business-program/
- Cohere pricing: https://cohere.com/pricing
