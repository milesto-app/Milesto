import { MIN_DISTINCT_OPTIONS } from './constants/intake.constants.js';

export { validateStructural } from './intake-structure-validator.js';

interface QuestionInput {
  question_text: string;
  question_type: string;
  config: Record<string, unknown> | null;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateSemantic(questions: QuestionInput[]): ValidationResult {
  const errors: string[] = [];
  validateQuestionMarks(questions, errors);
  validateNoDuplicates(questions, errors);
  validateChoiceOptions(questions, errors);
  validateTypeVariety(questions, errors);
  return { valid: errors.length === 0, errors };
}

function validateQuestionMarks(
  questions: QuestionInput[],
  errors: string[],
): void {
  for (const [i, question] of questions.entries()) {
    if (!question.question_text.endsWith('?')) {
      errors.push(`Question ${String(i + 1)}: question_text must end with "?"`);
    }
  }
}

function validateNoDuplicates(
  questions: QuestionInput[],
  errors: string[],
): void {
  const seen = new Set<string>();
  for (const [i, question] of questions.entries()) {
    const lower = question.question_text.toLowerCase();
    if (seen.has(lower)) {
      errors.push(
        `Question ${String(i + 1)}: duplicate question_text "${question.question_text}"`,
      );
    }
    seen.add(lower);
  }
}

function validateChoiceOptions(
  questions: QuestionInput[],
  errors: string[],
): void {
  for (const [i, q] of questions.entries()) {
    if (
      q.question_type !== 'single_choice' &&
      q.question_type !== 'multiple_choice'
    ) {
      continue;
    }
    const options = (q.config as { options?: string[] } | null)?.options ?? [];
    const distinct = new Set(options);
    if (distinct.size < MIN_DISTINCT_OPTIONS) {
      errors.push(
        `Question ${String(i + 1)}: choice question must have at least ${String(MIN_DISTINCT_OPTIONS)} distinct options`,
      );
    }
  }
}

function validateTypeVariety(
  questions: QuestionInput[],
  errors: string[],
): void {
  const types = new Set(questions.map((q) => q.question_type));
  if (types.size < MIN_DISTINCT_OPTIONS) {
    errors.push(
      `Batch must contain at least ${String(MIN_DISTINCT_OPTIONS)} different question_types`,
    );
  }
}

const REQUIRED_PROFILE_SECTIONS = [
  'current_state',
  'desired_state',
  'constraints',
  'motivation',
  'domain_context',
  'narrative_summary',
] as const;

export function validateGoalProfile(profile: unknown): ValidationResult {
  if (
    profile === null ||
    profile === undefined ||
    typeof profile !== 'object' ||
    Array.isArray(profile)
  ) {
    return { valid: false, errors: ['Profile is not an object'] };
  }
  const errors: string[] = [];
  const p = profile as Record<string, unknown>;
  validateRequiredSections(p, errors);
  validateInsights(p, errors);
  return { valid: errors.length === 0, errors };
}

function validateRequiredSections(
  p: Record<string, unknown>,
  errors: string[],
): void {
  for (const key of REQUIRED_PROFILE_SECTIONS) {
    if (!(key in p)) {
      errors.push(`Missing required section: ${key}`);
    } else if (typeof p[key] !== 'string' || p[key].trim() === '') {
      errors.push(`Section ${key} must be a non-empty string`);
    }
  }
}

function validateInsights(p: Record<string, unknown>, errors: string[]): void {
  if (
    !('goal_specific_insights' in p) ||
    p.goal_specific_insights === null ||
    p.goal_specific_insights === undefined
  ) {
    return;
  }
  const insights = p.goal_specific_insights;
  if (typeof insights !== 'object' || Array.isArray(insights)) {
    errors.push('goal_specific_insights must be a non-array object');
    return;
  }
  for (const [key, value] of Object.entries(
    insights as Record<string, unknown>,
  )) {
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(
        `goal_specific_insights["${key}"] must be a non-empty string`,
      );
    }
  }
}
