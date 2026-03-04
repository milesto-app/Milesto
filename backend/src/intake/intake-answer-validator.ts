import { BadRequestException } from '@nestjs/common';

import {
  DEFAULT_SCALE_MAX,
  DEFAULT_SCALE_MIN,
  SINGLE_CHOICE_OPTION_COUNT,
} from './constants/intake.constants.js';

interface AnswerInput {
  question_id: string;
  answer_text?: string;
  answer_numeric?: number;
  selected_options?: string[];
}

interface QuestionConfig {
  min?: number;
  max?: number;
  options?: string[];
  format?: string;
}

interface QuestionInput {
  question_type: string;
  config: QuestionConfig | null;
}

function validateTextAnswer(
  answer: AnswerInput,
  config: QuestionConfig | null,
): void {
  if (answer.answer_text === undefined || answer.answer_text.trim() === '') {
    throw new BadRequestException(
      'Text question requires a non-empty answer_text',
    );
  }
  validateDateFormat(answer.answer_text, config);
  if (
    answer.answer_numeric !== undefined ||
    answer.selected_options !== undefined
  ) {
    throw new BadRequestException(
      'Text question must not have answer_numeric or selected_options',
    );
  }
}

function validateDateFormat(text: string, config: QuestionConfig | null): void {
  if (config?.format !== 'date') {
    return;
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(text) || isNaN(new Date(`${text}T00:00:00Z`).getTime())) {
    throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD.');
  }
}

function validateScaleAnswer(
  answer: AnswerInput,
  config: QuestionConfig | null,
): void {
  if (answer.answer_numeric === undefined) {
    throw new BadRequestException('Scale question requires answer_numeric');
  }
  validateScaleRange(answer.answer_numeric, config);
  if (
    answer.answer_text !== undefined ||
    answer.selected_options !== undefined
  ) {
    throw new BadRequestException(
      'Scale question must not have answer_text or selected_options',
    );
  }
}

function validateScaleRange(
  value: number,
  config: QuestionConfig | null,
): void {
  const min = config?.min ?? DEFAULT_SCALE_MIN;
  const max = config?.max ?? DEFAULT_SCALE_MAX;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new BadRequestException(
      `Scale answer must be an integer between ${String(min)} and ${String(max)}`,
    );
  }
}

function validateSingleChoiceAnswer(
  answer: AnswerInput,
  config: QuestionConfig | null,
): void {
  const options = config?.options ?? [];
  if (
    !Array.isArray(answer.selected_options) ||
    answer.selected_options.length !== SINGLE_CHOICE_OPTION_COUNT
  ) {
    throw new BadRequestException(
      'Single choice question requires exactly one selected option',
    );
  }
  const selected = answer.selected_options[0];
  if (selected === undefined || !options.includes(selected)) {
    throw new BadRequestException(`Invalid option: ${String(selected)}`);
  }
  if (answer.answer_text !== undefined || answer.answer_numeric !== undefined) {
    throw new BadRequestException(
      'Single choice question must not have answer_text or answer_numeric',
    );
  }
}

function validateMultipleChoiceAnswer(
  answer: AnswerInput,
  config: QuestionConfig | null,
): void {
  const options = config?.options ?? [];
  if (
    !Array.isArray(answer.selected_options) ||
    answer.selected_options.length === 0
  ) {
    throw new BadRequestException(
      'Multiple choice question requires at least one selected option',
    );
  }
  for (const opt of answer.selected_options) {
    if (!options.includes(opt)) {
      throw new BadRequestException(`Invalid option: ${opt}`);
    }
  }
  if (answer.answer_text !== undefined || answer.answer_numeric !== undefined) {
    throw new BadRequestException(
      'Multiple choice question must not have answer_text or answer_numeric',
    );
  }
}

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
  for (const answer of answers) {
    const question = questionMap.get(answer.question_id);
    if (question === undefined) {
      throw new BadRequestException(
        `Question ${answer.question_id} does not belong to this batch`,
      );
    }
    validateAnswer(answer, question);
  }
}

export function validateAnswer(
  answer: AnswerInput,
  question: QuestionInput,
): void {
  switch (question.question_type) {
    case 'text':
      validateTextAnswer(answer, question.config);
      break;
    case 'scale':
      validateScaleAnswer(answer, question.config);
      break;
    case 'single_choice':
      validateSingleChoiceAnswer(answer, question.config);
      break;
    case 'multiple_choice':
      validateMultipleChoiceAnswer(answer, question.config);
      break;
    default:
      throw new BadRequestException(
        `Unknown question type: ${question.question_type}`,
      );
  }
}
