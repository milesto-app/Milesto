import type { GoldStandard } from '../gold-standards.js';

export const LANGUAGE_LEARNING_STANDARD: GoldStandard = {
  domain: 'Language Learning',
  goalDescription: 'Learn Spanish for an upcoming trip to Mexico',
  questions: [
    {
      question_text: 'How much Spanish do you actually know right now?',
      question_type: 'single_choice',
      config: {
        options: [
          'Zero (Hola = Hello)',
          'Survival (Can order a beer)',
          'Conversational (Can chat but with mistakes)',
          'Rusty (I took it in school 10 years ago)',
        ],
      },
      rationale:
        'Faster and more accurate than a 1-10 scale. "Rusty" implies reactivatable knowledge.',
    },
    {
      question_text:
        "We know language apps can get boring. If you've tried before, why did you stop?",
      question_type: 'single_choice',
      config: {
        options: [
          "I felt like I wasn't making progress",
          'The gamification annoyed me',
          'I got busy and missed a streak',
          "I didn't have anyone to practice with",
        ],
      },
      rationale:
        'Failure mode: Lack of feedback vs Lack of utility vs Schedule slip.',
    },
    {
      question_text:
        'To get results, you need "input" (listening/reading). How do you currently commute or spend downtime?',
      question_type: 'single_choice',
      config: {
        options: [
          'Driving (Audio only)',
          'Public Transit (Can read/watch)',
          'Walking (Audio only)',
          'I work from home (No commute)',
        ],
      },
      rationale:
        "Hidden resource constraint. Can't assign reading exercises to a driver.",
    },
    {
      question_text:
        'What is the specific interaction you are visualizing having on your trip?',
      question_type: 'single_choice',
      config: {
        options: [
          'Ordering food like a local',
          'Chatting with a taxi driver',
          'Flirting or making friends',
          'Just not looking like a clueless tourist',
        ],
      },
      rationale:
        '"Flirting" vs "Not looking clueless" = Approach vs Avoidance motivation.',
    },
    {
      question_text:
        'Realistically, how much "embarrassment" are you willing to tolerate to learn faster?',
      question_type: 'single_choice',
      config: {
        options: [
          'None, I want to be perfect before I speak',
          "A little, I'll speak if I have to",
          "I don't care, I'll talk to anyone even if I look silly",
        ],
      },
      rationale:
        '#1 predictor of language success. "None" is a major red flag.',
    },
  ],
  simulatedBatch1Answers: {
    batch_number: 1,
    questions: [
      {
        question_text: 'Which best describes your starting point with this?',
        question_type: 'single_choice',
        answer: "I know the basics but haven't put them into practice yet",
      },
      {
        question_text:
          "What specifically will you be able to do, have, or experience when this is achieved — something you can't today?",
        question_type: 'text',
        answer:
          'Being able to have a basic conversation with locals without pulling out Google Translate every 10 seconds.',
      },
      {
        question_text:
          'How many hours per week can you realistically protect for this — even on your busiest weeks?',
        question_type: 'scale',
        answer: '5',
      },
      {
        question_text: "When do you want to be able to say 'I did this'?",
        question_type: 'text',
        answer: '2026-06-20',
        config: { format: 'date' },
      },
      {
        question_text:
          "Most people reach a moment where something shifts from 'I should do this' to 'I need to do this now.' What was that moment for you?",
        question_type: 'single_choice',
        answer: 'A deadline or life change is on the horizon',
      },
    ],
  },
};
