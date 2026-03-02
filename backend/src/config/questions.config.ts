export interface PriorBatchContext {
  batch_number: number;
  questions: {
    question_text: string;
    question_type: string;
    answer: string;
    config?: Record<string, unknown> | null;
  }[];
}

export interface GoalProfile {
  current_state: string;
  desired_state: string;
  constraints: string;
  motivation: string;
  domain_context: string;
  narrative_summary: string;
  goal_specific_insights?: Record<string, string>;
}

export interface UniversalQuestion {
  question_text: string;
  question_type: 'text' | 'scale' | 'single_choice';
  config: Record<string, unknown> | null;
  order_in_batch: number;
}

export interface GeneratedQuestion {
  question_text: string;
  question_type: 'text' | 'scale' | 'single_choice' | 'multiple_choice';
  config: Record<string, unknown> | null;
  order_in_batch: number;
}

export const UNIVERSAL_BATCH_1: UniversalQuestion[] = [
  {
    question_text: 'Which best describes your starting point with this?',
    question_type: 'single_choice',
    config: {
      options: [
        'Complete beginner — I have little to no experience or knowledge here',
        "I know the basics but haven't put them into practice yet",
        "I've tried bits and pieces but nothing consistent or structured",
        "I have a decent foundation but hit a ceiling I can't get past",
        'I used to be further along but lost ground and need to rebuild',
      ],
    },
    order_in_batch: 1,
  },
  {
    question_text:
      "What specifically will you be able to do, have, or experience when this is achieved — something you can't today?",
    question_type: 'text',
    config: null,
    order_in_batch: 2,
  },
  {
    question_text:
      'How many hours per week can you realistically protect for this — even on your busiest weeks?',
    question_type: 'scale',
    config: {
      min: 1,
      max: 20,
      min_label: "1 hour — but it's non-negotiable",
      max_label: "20+ hours — I'm restructuring my life for this",
    },
    order_in_batch: 3,
  },
  {
    question_text: "When do you want to be able to say 'I did this'?",
    question_type: 'text',
    config: { format: 'date' },
    order_in_batch: 4,
  },
  {
    question_text:
      "Most people reach a moment where something shifts from 'I should do this' to 'I need to do this now.' What was that moment for you?",
    question_type: 'single_choice',
    config: {
      options: [
        'A specific event or conversation that hit hard',
        'A gradual buildup that finally reached a tipping point',
        'Seeing someone else achieve what I want',
        'A deadline or life change is on the horizon',
        'Something just clicked — I woke up ready to start',
      ],
    },
    order_in_batch: 5,
  },
];

export { FALLBACK_POOLS } from './fallback-questions.config.js';
