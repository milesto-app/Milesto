import { BadRequestException } from "@nestjs/common";

import { config } from "../config/app.config.js";
import {
  DEFAULT_SCALE_MAX,
  DEFAULT_SCALE_MIN,
  MAX_QUESTION_TEXT_LENGTH,
  MIN_DISTINCT_OPTIONS,
  SINGLE_CHOICE_OPTION_COUNT,
  VALID_QUESTION_TYPES,
} from "./constants/intake.constants.js";
import type { AnswerInput } from "./types/intake.types.js";

interface QuestionConfig {
  min?: number;
  max?: number;
  options?: string[];
  format?: string;
}

interface QuestionInput {
  question_text: string;
  question_type: string;
  config: Record<string, unknown> | null;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const REQUIRED_PROFILE_SECTIONS = [
  "current_state",
  "desired_state",
  "constraints",
  "motivation",
  "domain_context",
  "narrative_summary",
] as const;

// ---------- Answer-side validation (called when user submits answers) ----------

export function validateAnswerSet(
  answers: AnswerInput[],
  questions: Array<{
    id: string;
    question_type: string;
    config: QuestionConfig | null;
  }>,
): void {
  if (answers.length !== questions.length) {
    throw new BadRequestException(
      `Expected ${String(questions.length)} answers but received ${String(answers.length)}`,
    );
  }
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  for (const answer of answers) {
    const question = questionMap.get(answer.question_id);
    if (question === undefined) {
      throw new BadRequestException(
        `Question ${answer.question_id} does not belong to this batch`,
      );
    }
    if (seen.has(answer.question_id)) {
      throw new BadRequestException(
        `Question ${answer.question_id} answered more than once`,
      );
    }
    seen.add(answer.question_id);
    validateAnswer(answer, question);
  }
  if (seen.size !== questionMap.size) {
    throw new BadRequestException(
      "Every batch question must be answered exactly once",
    );
  }
}

export function validateAnswer(
  answer: AnswerInput,
  question: { question_type: string; config: QuestionConfig | null },
): void {
  switch (question.question_type) {
    case "text":
      validateTextAnswer(answer, question.config);
      break;
    case "scale":
      validateScaleAnswer(answer, question.config);
      break;
    case "single_choice":
      validateSingleChoiceAnswer(answer, question.config);
      break;
    case "multiple_choice":
      validateMultipleChoiceAnswer(answer, question.config);
      break;
    default:
      throw new BadRequestException(
        `Unknown question type: ${question.question_type}`,
      );
  }
}

function validateTextAnswer(
  answer: AnswerInput,
  questionConfig: QuestionConfig | null,
): void {
  if (answer.answer_text === undefined || answer.answer_text.trim() === "") {
    throw new BadRequestException(
      "Text question requires a non-empty answer_text",
    );
  }
  validateDateFormat(answer.answer_text, questionConfig);
  if (
    answer.answer_numeric !== undefined ||
    answer.selected_options !== undefined
  ) {
    throw new BadRequestException(
      "Text question must not have answer_numeric or selected_options",
    );
  }
}

function validateDateFormat(
  text: string,
  questionConfig: QuestionConfig | null,
): void {
  if (questionConfig?.format !== "date") {
    return;
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(text) || isNaN(new Date(`${text}T00:00:00Z`).getTime())) {
    throw new BadRequestException("Invalid date format. Expected YYYY-MM-DD.");
  }
}

function validateScaleAnswer(
  answer: AnswerInput,
  questionConfig: QuestionConfig | null,
): void {
  if (answer.answer_numeric === undefined) {
    throw new BadRequestException("Scale question requires answer_numeric");
  }
  validateScaleRange(answer.answer_numeric, questionConfig);
  if (
    answer.answer_text !== undefined ||
    answer.selected_options !== undefined
  ) {
    throw new BadRequestException(
      "Scale question must not have answer_text or selected_options",
    );
  }
}

function validateScaleRange(
  value: number,
  questionConfig: QuestionConfig | null,
): void {
  const min = questionConfig?.min ?? DEFAULT_SCALE_MIN;
  const max = questionConfig?.max ?? DEFAULT_SCALE_MAX;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new BadRequestException(
      `Scale answer must be an integer between ${String(min)} and ${String(max)}`,
    );
  }
}

function validateSingleChoiceAnswer(
  answer: AnswerInput,
  questionConfig: QuestionConfig | null,
): void {
  const options = questionConfig?.options ?? [];
  if (
    !Array.isArray(answer.selected_options) ||
    answer.selected_options.length !== SINGLE_CHOICE_OPTION_COUNT
  ) {
    throw new BadRequestException(
      "Single choice question requires exactly one selected option",
    );
  }
  const selected = answer.selected_options[0];
  if (selected === undefined || !options.includes(selected)) {
    throw new BadRequestException(`Invalid option: ${String(selected)}`);
  }
  if (answer.answer_text !== undefined || answer.answer_numeric !== undefined) {
    throw new BadRequestException(
      "Single choice question must not have answer_text or answer_numeric",
    );
  }
}

function validateMultipleChoiceAnswer(
  answer: AnswerInput,
  questionConfig: QuestionConfig | null,
): void {
  const options = questionConfig?.options ?? [];
  if (
    !Array.isArray(answer.selected_options) ||
    answer.selected_options.length === 0
  ) {
    throw new BadRequestException(
      "Multiple choice question requires at least one selected option",
    );
  }
  for (const opt of answer.selected_options) {
    if (!options.includes(opt)) {
      throw new BadRequestException(`Invalid option: ${opt}`);
    }
  }
  if (answer.answer_text !== undefined || answer.answer_numeric !== undefined) {
    throw new BadRequestException(
      "Multiple choice question must not have answer_text or answer_numeric",
    );
  }
}

// ---------- Generated batch validation (called after AI generates questions) ----------

export function validateStructural(questions: unknown[]): ValidationResult {
  const errors: string[] = [];
  const { min, max } = config.intake.questionsPerBatch;

  if (!Array.isArray(questions)) {
    return { valid: false, errors: ["Input is not an array"] };
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
    typeof q.question_text !== "string" ||
    q.question_text.trim() === ""
  ) {
    errors.push(`${prefix}: missing or empty question_text`);
    return;
  }
  if (q.question_text.length > MAX_QUESTION_TEXT_LENGTH) {
    errors.push(
      `${prefix}: question_text exceeds ${String(MAX_QUESTION_TEXT_LENGTH)} characters (got ${String(q.question_text.length)})`,
    );
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
  if (q.question_type === "text") {
    if (q.config !== null && q.config !== undefined) {
      errors.push(`${prefix}: text question config must be null`);
    }
  } else if (q.question_type === "scale") {
    validateScaleConfig(
      q.config as Record<string, unknown> | null | undefined,
      prefix,
      errors,
    );
  } else if (
    q.question_type === "single_choice" ||
    q.question_type === "multiple_choice"
  ) {
    validateChoiceConfig(
      q.config as Record<string, unknown> | null | undefined,
      prefix,
      errors,
    );
  }
}

function validateScaleConfig(
  questionConfig: Record<string, unknown> | null | undefined,
  prefix: string,
  errors: string[],
): void {
  if (
    questionConfig === null ||
    questionConfig === undefined ||
    typeof questionConfig !== "object" ||
    typeof questionConfig.min !== "number" ||
    typeof questionConfig.max !== "number"
  ) {
    errors.push(
      `${prefix}: scale question config must have min and max numbers`,
    );
  }
}

function validateChoiceConfig(
  questionConfig: Record<string, unknown> | null | undefined,
  prefix: string,
  errors: string[],
): void {
  if (
    questionConfig === null ||
    questionConfig === undefined ||
    typeof questionConfig !== "object" ||
    !Array.isArray(questionConfig.options)
  ) {
    errors.push(`${prefix}: choice question config must have options array`);
  }
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
    if (!question.question_text.endsWith("?")) {
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
      q.question_type !== "single_choice" &&
      q.question_type !== "multiple_choice"
    ) {
      continue;
    }
    const options = Array.isArray(q.config?.options) ? q.config.options : [];
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

export function validateBatch(questions: unknown[]): {
  valid: boolean;
  errors: string[];
  layer: "structural" | "semantic";
} {
  const structural = validateStructural(questions);
  if (!structural.valid) {
    return { valid: false, errors: structural.errors, layer: "structural" };
  }
  const semantic = validateSemantic(
    questions as Array<{
      question_text: string;
      question_type: string;
      config: Record<string, unknown> | null;
    }>,
  );
  if (!semantic.valid) {
    return { valid: false, errors: semantic.errors, layer: "semantic" };
  }
  return { valid: true, errors: [], layer: "semantic" };
}

// ---------- Generated profile validation ----------

export function validateGoalProfile(profile: unknown): ValidationResult {
  if (
    profile === null ||
    profile === undefined ||
    typeof profile !== "object" ||
    Array.isArray(profile)
  ) {
    return { valid: false, errors: ["Profile is not an object"] };
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
    } else if (typeof p[key] !== "string" || p[key].trim() === "") {
      errors.push(`Section ${key} must be a non-empty string`);
    }
  }
}

function validateInsights(p: Record<string, unknown>, errors: string[]): void {
  if (
    !("goal_specific_insights" in p) ||
    p.goal_specific_insights === null ||
    p.goal_specific_insights === undefined
  ) {
    return;
  }
  const insights = p.goal_specific_insights;
  if (typeof insights !== "object" || Array.isArray(insights)) {
    errors.push("goal_specific_insights must be a non-array object");
    return;
  }
  for (const [key, value] of Object.entries(
    insights as Record<string, unknown>,
  )) {
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(
        `goal_specific_insights["${key}"] must be a non-empty string`,
      );
    }
  }
}
