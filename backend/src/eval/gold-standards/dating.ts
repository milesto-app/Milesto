import type { GoldStandard } from "../gold-standards.js";

export const DATING_STANDARD: GoldStandard = {
  domain: "Dating",
  goalDescription: "Find a serious long-term partner",
  questions: [
    {
      question_text:
        'Think of the last decent date you went on. What made it "good"?',
      question_type: "single_choice",
      config: {
        options: [
          "Great conversation flow",
          "Physical attraction",
          "Shared values",
          "We laughed a lot",
        ],
      },
      rationale:
        "Defines priority filter: Intellectual vs Physical vs Emotional.",
    },
    {
      question_text:
        "In past relationships, what is the pattern that usually causes the end?",
      question_type: "single_choice",
      config: {
        options: [
          "We drifted apart (Boredom)",
          "Constant conflict (Incompatibility)",
          "Trust issues",
          "I lost myself in the relationship (Codependency)",
        ],
      },
      rationale:
        'High-density psychological profiling. "Codependency" is a massive coaching signal.',
    },
    {
      question_text:
        "Dating takes time. How many evenings per week are you actually willing to give up for dates?",
      question_type: "single_choice",
      config: {
        options: [
          "1 night max",
          "2-3 nights",
          "I'm free whenever",
          "I'm honestly too busy to date right now",
        ],
      },
      rationale: '"Too busy" = goal is unrealistic until schedule changes.',
    },
    {
      question_text: "Why are you looking now?",
      question_type: "single_choice",
      config: {
        options: [
          "I'm tired of being alone",
          "All my friends are pairing up",
          "I want to start a family soon",
          "I finally feel ready after a breakup",
        ],
      },
      rationale:
        '"Friends pairing up" = External FOMO. "I feel ready" = Internal growth.',
    },
    {
      question_text:
        "If you saw someone attractive at a coffee shop today, what would you honestly do?",
      question_type: "single_choice",
      config: {
        options: [
          "Go say hi immediately",
          "Make eye contact and hope they come over",
          "Look away and check my phone",
          "Leave",
        ],
      },
      rationale:
        "Initiation Confidence assessment. Coach needs to know: find matches or act on matches?",
    },
  ],
  simulatedBatch1Answers: {
    batch_number: 1,
    questions: [
      {
        question_text: "Which best describes your starting point with this?",
        question_type: "single_choice",
        answer:
          "I've tried bits and pieces but nothing consistent or structured",
      },
      {
        question_text:
          "What specifically will you be able to do, have, or experience when this is achieved — something you can't today?",
        question_type: "text",
        answer:
          "Being in a relationship where I feel genuinely excited to come home to someone.",
      },
      {
        question_text:
          "How many hours per week can you realistically protect for this — even on your busiest weeks?",
        question_type: "scale",
        answer: "6",
      },
      {
        question_text: "When do you want to be able to say 'I did this'?",
        question_type: "text",
        answer: "2026-12-01",
        config: { format: "date" },
      },
      {
        question_text:
          "Most people reach a moment where something shifts from 'I should do this' to 'I need to do this now.' What was that moment for you?",
        question_type: "single_choice",
        answer: "Something just clicked — I woke up ready to start",
      },
    ],
  },
};
