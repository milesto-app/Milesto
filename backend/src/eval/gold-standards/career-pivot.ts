import type { GoldStandard } from '../gold-standards.js';

export const CAREER_PIVOT_STANDARD: GoldStandard = {
  domain: 'Career Pivot',
  goalDescription: 'Switch from a stable accounting job to UX design',
  questions: [
    {
      question_text: 'Which of these tasks currently drains your battery the fastest?',
      question_type: 'single_choice',
      config: {
        options: [
          'Meetings & Politics',
          'Repetitive Admin work',
          'Dealing with angry clients',
          'Being micromanaged',
          'The sheer volume of work',
        ],
      },
      rationale:
        'Defines the "Push" factor. What they hate is easier to articulate than what they love.',
    },
    {
      question_text:
        'If you had to spend 5 hours learning UX design this week, when would it actually happen?',
      question_type: 'single_choice',
      config: {
        options: [
          'Before work (early mornings)',
          'Lunch breaks',
          'After work (sacrificing relaxation)',
          'Weekends only',
        ],
      },
      rationale: 'Reality check. "After work" = burnout risk. "Weekends" = slow progress.',
    },
    {
      question_text:
        'When you think about making this jump, what is the "3 a.m. worry" that keeps you up?',
      question_type: 'single_choice',
      config: {
        options: [
          "That I'm not actually good enough (Imposter Syndrome)",
          "That I'll run out of money",
          "That I'll regret leaving my safe job",
          "That I'm too old to start over",
        ],
      },
      rationale:
        'Primary fear blocker. Allows coach to address the emotional elephant immediately.',
    },
    {
      question_text:
        'Are you looking to change what you do (new role) or where you do it (new industry)?',
      question_type: 'single_choice',
      config: {
        options: [
          'Same role, cooler industry',
          'Totally new role, same industry',
          'Total reinvention (new role & industry)',
          "I'm not sure yet",
        ],
      },
      rationale: 'Scope of pivot. "Total reinvention" requires 10x more energy.',
    },
    {
      question_text: 'If we succeed, what does your ideal Tuesday morning look like in 6 months?',
      question_type: 'text',
      config: null,
      rationale: 'Concrete lifestyle visualization. Sustains motivation through job hunting.',
    },
  ],
  simulatedBatch1Answers: {
    batch_number: 1,
    questions: [
      {
        question_text: 'Which best describes your starting point with this?',
        question_type: 'single_choice',
        answer: 'Complete beginner — I have little to no experience or knowledge here',
      },
      {
        question_text:
          "What specifically will you be able to do, have, or experience when this is achieved — something you can't today?",
        question_type: 'text',
        answer: 'Landing a junior UX role at a tech company, even if it means a pay cut initially.',
      },
      {
        question_text:
          'How many hours per week can you realistically protect for this — even on your busiest weeks?',
        question_type: 'scale',
        answer: '8',
      },
      {
        question_text: "When do you want to be able to say 'I did this'?",
        question_type: 'text',
        answer: '2027-02-01',
        config: { format: 'date' },
      },
      {
        question_text:
          "Most people reach a moment where something shifts from 'I should do this' to 'I need to do this now.' What was that moment for you?",
        question_type: 'single_choice',
        answer: 'A gradual buildup that finally reached a tipping point',
      },
    ],
  },
};
