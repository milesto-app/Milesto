import { appConfig } from '../config/app.config.js';
import { VALID_QUESTION_TYPES } from './constants/intake.constants.js';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateStructural(questions: unknown[]): ValidationResult {
  const errors: string[] = [];
  const { min, max } = appConfig.intake.questionsPerBatch;

  if (!Array.isArray(questions)) {
    return { valid: false, errors: ['Input is not an array'] };
  }

  if (questions.length < min || questions.length > max) {
    errors.push(
      `Expected ${String(min)}-${String(max)} questions, got ${String(questions.length)}`,
    );
  }

  for (const [i, item] of questions.entries()) {
    const q = item as Record<string, unknown>;
    const prefix = `Question ${String(i + 1)}`;
    validateQuestionShape({ q, prefix, index: i, errors });
  }

  return { valid: errors.length === 0, errors };
}

function validateQuestionShape(params: {
  q: Record<string, unknown>;
  prefix: string;
  index: number;
  errors: string[];
}): void {
  const { q, prefix, index, errors } = params;
  validateTextField(q, prefix, errors);
  validateTypeField(q, prefix, errors);
  validateQuestionConfig(q, prefix, errors);
  if (q.order_in_batch !== index + 1) {
    errors.push(
      `${prefix}: order_in_batch should be ${String(index + 1)}, got ${String(q.order_in_batch)}`,
    );
  }
}

function validateTextField(
  q: Record<string, unknown>,
  prefix: string,
  errors: string[],
): void {
  if (
    q.question_text === undefined ||
    typeof q.question_text !== 'string' ||
    q.question_text.trim() === ''
  ) {
    errors.push(`${prefix}: missing or empty question_text`);
  }
}

function validateTypeField(
  q: Record<string, unknown>,
  prefix: string,
  errors: string[],
): void {
  if (
    q.question_type === undefined ||
    !VALID_QUESTION_TYPES.includes(
      q.question_type as (typeof VALID_QUESTION_TYPES)[number],
    )
  ) {
    errors.push(
      `${prefix}: invalid question_type "${String(q.question_type)}"`,
    );
  }
}

function validateQuestionConfig(
  q: Record<string, unknown>,
  prefix: string,
  errors: string[],
): void {
  if (q.question_type === 'text') {
    if (q.config !== null && q.config !== undefined) {
      errors.push(`${prefix}: text question config must be null`);
    }
  } else if (q.question_type === 'scale') {
    validateScaleConfig(
      q.config as Record<string, unknown> | null | undefined,
      prefix,
      errors,
    );
  } else if (
    q.question_type === 'single_choice' ||
    q.question_type === 'multiple_choice'
  ) {
    validateChoiceConfig(
      q.config as Record<string, unknown> | null | undefined,
      prefix,
      errors,
    );
  }
}

function validateScaleConfig(
  config: Record<string, unknown> | null | undefined,
  prefix: string,
  errors: string[],
): void {
  if (
    config === null ||
    config === undefined ||
    typeof config !== 'object' ||
    typeof config.min !== 'number' ||
    typeof config.max !== 'number'
  ) {
    errors.push(
      `${prefix}: scale question config must have min and max numbers`,
    );
  }
}

function validateChoiceConfig(
  config: Record<string, unknown> | null | undefined,
  prefix: string,
  errors: string[],
): void {
  if (
    config === null ||
    config === undefined ||
    typeof config !== 'object' ||
    !Array.isArray(config.options)
  ) {
    errors.push(`${prefix}: choice question config must have options array`);
  }
}
