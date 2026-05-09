export const MAX_GENERATION_ATTEMPTS = 3;
export const FIRST_BATCH_NUMBER = 1;
export const DEFAULT_SCALE_MIN = 0;
export const DEFAULT_SCALE_MAX = 100;
export const MIN_DISTINCT_OPTIONS = 2;
export const MIN_ANSWER_LENGTH_SHORT = 20;
export const MAX_ANSWER_LENGTH_LONG = 200;
export const MAX_QUESTION_TEXT_LENGTH = 140;
export const SINGLE_CHOICE_OPTION_COUNT = 1;

export const VALID_QUESTION_TYPES = [
  "text",
  "scale",
  "single_choice",
  "multiple_choice",
] as const;
