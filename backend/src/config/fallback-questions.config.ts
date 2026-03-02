import type { GeneratedQuestion } from './questions.config.js';

// ── Fallback pools (used when AI generation fails validation) ──
// Designed with mixed question types, normalizing language, and shame-safe options.

export const FALLBACK_POOLS: GeneratedQuestion[][] = [
  // Pool 0: Resources + failure mechanism + behavioral baseline
  [
    {
      question_text: 'What do you already have going for you that could help with this?',
      question_type: 'multiple_choice',
      config: {
        options: [
          'Some knowledge or skills in this area',
          'Access to tools, equipment, or a good environment',
          'A flexible schedule I can reorganize',
          'People around me who could help or join me',
          'Financial resources to invest in this',
          'Strong motivation — I just need a clear path',
          "Honestly, not much yet — I'm starting from scratch",
        ],
      },
      order_in_batch: 1,
    },
    {
      question_text: "When you've tried something like this before, what typically got in the way?",
      question_type: 'single_choice',
      config: {
        options: [
          'Life got busy and it slipped off my radar',
          'The approach felt too rigid or complicated',
          'I lost motivation after the initial excitement',
          "I didn't have the right support or accountability",
          'This is actually my first real attempt',
        ],
      },
      order_in_batch: 2,
    },
    {
      question_text:
        'Walk me through what a typical weekday looks like for you — from morning to evening?',
      question_type: 'text',
      config: null,
      order_in_batch: 3,
    },
  ],
  // Pool 1: Identity + commitment signal
  [
    {
      question_text:
        "When you picture yourself a year from now having made real progress — is this more about what you'll be able to do, or who you'll have become?",
      question_type: 'single_choice',
      config: {
        options: [
          "It's about a specific skill or ability I want to have",
          "It's about changing how I see myself",
          "It's about proving something to myself or others",
          "It's about opening a door to something bigger",
          'Honestly, a mix of all of these',
        ],
      },
      order_in_batch: 1,
    },
    {
      question_text:
        "To make real progress, what's the one thing you'd realistically need to cut back on or give up?",
      question_type: 'single_choice',
      config: {
        options: [
          'Screen time and social media',
          'Social commitments or going out',
          'Sleep — getting up earlier or staying up later',
          'Spending money on non-essentials',
          "Comfort and routine — I'd need to do uncomfortable things",
          "I'm honestly not sure yet",
        ],
      },
      order_in_batch: 2,
    },
  ],
  // Pool 2: Support system + coping patterns + resilience style
  [
    {
      question_text:
        'How supportive is your immediate circle (partner, family, close friends) of this goal?',
      question_type: 'scale',
      config: {
        min: 1,
        max: 5,
        min_label: "They don't know about it",
        max_label: "They're fully on board",
      },
      order_in_batch: 1,
    },
    {
      question_text: "When you're stressed or having a rough day, what's your go-to way of coping?",
      question_type: 'single_choice',
      config: {
        options: [
          'Eat or drink something comforting',
          'Scroll my phone or zone out with screens',
          'Withdraw and isolate',
          'Talk to someone about it',
          'Exercise or get moving',
          'Push through and ignore it',
        ],
      },
      order_in_batch: 2,
    },
    {
      question_text:
        'If you hit a setback and fell off track for a few days — which happens to everyone — which sounds most like you?',
      question_type: 'single_choice',
      config: {
        options: [
          "I'd probably give up and try again later",
          "I'd feel guilty but force myself back",
          "I'd shrug it off and keep going",
          "I'd take it as a sign my approach needs adjusting",
        ],
      },
      order_in_batch: 3,
    },
  ],
];
