import type { GoldStandard } from '../gold-standards.js';

export const WEIGHT_LOSS_STANDARD: GoldStandard = {
  domain: 'Weight Loss',
  goalDescription: 'Lose 20lbs and get back in shape',
  questions: [
    {
      question_text:
        'To help us calibrate, when was the last time you felt physically energetic and comfortable in your body?',
      question_type: 'single_choice',
      config: {
        options: [
          '6 months ago',
          '1-2 years ago',
          '3+ years ago',
          "I've never really felt that way",
        ],
      },
      rationale:
        'Establishes baseline without asking for a number. "Never" vs "6 months" radically changes coaching strategy.',
    },
    {
      question_text:
        'When you look at your current average week, where is the biggest "energy leak" that stops you from exercising?',
      question_type: 'single_choice',
      config: {
        options: [
          'Work leaves me mentally drained',
          'Family duties take up every spare minute',
          'I have free time but I just doom-scroll',
          'I get enough sleep but still wake up tired',
        ],
      },
      rationale:
        'Identifies blocker type: Mental fatigue vs Time scarcity vs Procrastination.',
    },
    {
      question_text:
        "Most people drift off their diet after 3 weeks. When you've stopped in the past, what usually triggers it?",
      question_type: 'single_choice',
      config: {
        options: [
          'A stressful event made me "stress eat"',
          'I was too hungry and binged',
          'The meal prep was too complicated',
          'Social events (dinners/drinks) derailed me',
        ],
      },
      rationale:
        'Normalizes failure ("Most people drift"). Distinguishes emotional eating from logistical friction.',
    },
    {
      question_text:
        'Honest check: What specific moment in the last 7 days made you say "Okay, enough is enough, I need to fix this"?',
      question_type: 'text',
      config: null,
      rationale: 'Finds the precipitating event. Massive coaching leverage.',
    },
    {
      question_text:
        "Imagine it's 3 months from now and you've hit your first goal. What is the one specific thing you are most excited to do?",
      question_type: 'single_choice',
      config: {
        options: [
          'Wear a specific outfit hiding in my closet',
          'Walk up stairs without getting winded',
          'Feel confident in photos',
          'Have energy to play with my kids',
        ],
      },
      rationale:
        'Concrete emotional anchor. Moves from abstract "weight loss" to visceral reward.',
    },
  ],
  simulatedBatch1Answers: {
    batch_number: 1,
    questions: [
      {
        question_text: 'Which best describes your starting point with this?',
        question_type: 'single_choice',
        answer:
          'I used to be further along but lost ground and need to rebuild',
      },
      {
        question_text:
          "What specifically will you be able to do, have, or experience when this is achieved — something you can't today?",
        question_type: 'text',
        answer:
          'Fitting into my old clothes and having energy to play with my kids without getting winded.',
      },
      {
        question_text:
          'How many hours per week can you realistically protect for this — even on your busiest weeks?',
        question_type: 'scale',
        answer: '6',
      },
      {
        question_text: "When do you want to be able to say 'I did this'?",
        question_type: 'text',
        answer: '2026-08-01',
        config: { format: 'date' },
      },
      {
        question_text:
          "Most people reach a moment where something shifts from 'I should do this' to 'I need to do this now.' What was that moment for you?",
        question_type: 'single_choice',
        answer: 'A specific event or conversation that hit hard',
      },
    ],
  },
};
