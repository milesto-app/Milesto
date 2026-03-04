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

const UNIVERSAL_BATCH_1_FR: UniversalQuestion[] = [
  {
    question_text:
      "Qu'est-ce qui d\u00e9crit le mieux ton point de d\u00e9part ?",
    question_type: 'single_choice',
    config: {
      options: [
        "D\u00e9butant complet \u2014 j'ai peu ou pas d'exp\u00e9rience ici",
        'Je connais les bases mais je ne les ai pas encore mises en pratique',
        "J'ai essay\u00e9 des choses mais rien de coh\u00e9rent ou structur\u00e9",
        "J'ai une bonne base mais j'ai atteint un plafond que je n'arrive pas \u00e0 d\u00e9passer",
        "J'\u00e9tais plus avanc\u00e9 avant mais j'ai perdu du terrain et je dois reconstruire",
      ],
    },
    order_in_batch: 1,
  },
  {
    question_text:
      "Que pourras-tu faire, avoir ou vivre concr\u00e8tement quand ce sera atteint \u2014 quelque chose que tu ne peux pas aujourd'hui ?",
    question_type: 'text',
    config: null,
    order_in_batch: 2,
  },
  {
    question_text:
      "Combien d'heures par semaine peux-tu r\u00e9alistement prot\u00e9ger pour \u00e7a \u2014 m\u00eame dans tes semaines les plus charg\u00e9es ?",
    question_type: 'scale',
    config: {
      min: 1,
      max: 20,
      min_label: '1 heure \u2014 mais c\u2019est non n\u00e9gociable',
      max_label: '20+ heures \u2014 je restructure ma vie pour \u00e7a',
    },
    order_in_batch: 3,
  },
  {
    question_text:
      "Quand veux-tu pouvoir dire \u00ab j'ai r\u00e9ussi \u00bb ?",
    question_type: 'text',
    config: { format: 'date' },
    order_in_batch: 4,
  },
  {
    question_text:
      'La plupart des gens atteignent un moment o\u00f9 quelque chose bascule de \u00ab je devrais le faire \u00bb \u00e0 \u00ab il faut que je le fasse maintenant \u00bb. Quel a \u00e9t\u00e9 ce moment pour toi ?',
    question_type: 'single_choice',
    config: {
      options: [
        "Un \u00e9v\u00e9nement ou une conversation qui m'a frapp\u00e9",
        'Une accumulation graduelle qui a fini par atteindre un point de basculement',
        "Voir quelqu'un d'autre accomplir ce que je veux",
        'Une \u00e9ch\u00e9ance ou un changement de vie approche',
        'Quelque chose a simplement cliqu\u00e9 \u2014 je me suis r\u00e9veill\u00e9 pr\u00eat \u00e0 commencer',
      ],
    },
    order_in_batch: 5,
  },
];

export function getUniversalBatch1(language: string): UniversalQuestion[] {
  return language === 'fr' ? UNIVERSAL_BATCH_1_FR : UNIVERSAL_BATCH_1;
}

export { getFallbackPools } from './fallback-questions.config.js';
