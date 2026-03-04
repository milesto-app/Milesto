import type { GoldStandard } from '../gold-standards.js';

export const SAVING_MONEY_STANDARD: GoldStandard = {
  domain: 'Saving Money',
  goalDescription: 'Save $10,000 for a house deposit',
  questions: [
    {
      question_text:
        'Without looking at your app, what was the last purchase you made that you instantly regretted?',
      question_type: 'text',
      config: null,
      rationale:
        'Low cognitive load (easy memory) but high emotional signal. Reveals impulse trigger category.',
    },
    {
      question_text: 'Everyone has a "blind spot" with money. What\'s yours?',
      question_type: 'single_choice',
      config: {
        options: [
          'Emotional spending (stress/happy)',
          'Social spending (drinks/dinners)',
          'Fixed costs are too high (rent/car)',
          "I simply don't earn enough yet",
        ],
      },
      rationale:
        'Removes shame by calling it a "blind spot." Distinguishes Behavioral vs Structural problems.',
    },
    {
      question_text: 'When do you usually deal with your finances?',
      question_type: 'single_choice',
      config: {
        options: [
          'I check my app daily',
          'I check once a month',
          'I avoid looking until I have to',
          'When my card gets declined',
        ],
      },
      rationale:
        'Measures Financial Anxiety. Avoidance is a key psychological barrier.',
    },
    {
      question_text:
        'Why is buying a house important to you personally (not just financially)?',
      question_type: 'single_choice',
      config: {
        options: [
          'Stability (No landlord)',
          'Freedom to renovate',
          'Building wealth for family',
          'Social status',
        ],
      },
      rationale:
        '"Stability" needs conservative plan. "Status" implies different timeline pressure.',
    },
    {
      question_text:
        'What is the first thing you will do when you get the keys?',
      question_type: 'text',
      config: null,
      rationale: 'Emotional reward hook. Creates visceral anchor.',
    },
  ],
  simulatedBatch1Answers: {
    batch_number: 1,
    questions: [
      {
        question_text: 'Which best describes your starting point with this?',
        question_type: 'single_choice',
        answer:
          "I've tried bits and pieces but nothing consistent or structured",
      },
      {
        question_text:
          "What specifically will you be able to do, have, or experience when this is achieved — something you can't today?",
        question_type: 'text',
        answer:
          'Having $10k in a dedicated savings account and knowing exactly where my money goes each month.',
      },
      {
        question_text:
          'How many hours per week can you realistically protect for this — even on your busiest weeks?',
        question_type: 'scale',
        answer: '3',
      },
      {
        question_text: "When do you want to be able to say 'I did this'?",
        question_type: 'text',
        answer: '2027-06-01',
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
