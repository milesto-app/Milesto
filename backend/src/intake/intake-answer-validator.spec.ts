import { BadRequestException } from '@nestjs/common';

import { validateAnswerSet } from './intake-answer-validator.js';

const TEXT_QUESTION = {
  id: 'q-1',
  question_type: 'text',
  config: null,
};
const SCALE_QUESTION = {
  id: 'q-2',
  question_type: 'scale',
  config: { min: 1, max: 10 },
};

describe('validateAnswerSet', () => {
  it('should accept exactly one answer per question', () => {
    expect(() => {
      validateAnswerSet(
        [
          { question_id: 'q-1', answer_text: 'hello' },
          { question_id: 'q-2', answer_numeric: 5 },
        ],
        [TEXT_QUESTION, SCALE_QUESTION],
      );
    }).not.toThrow();
  });

  it('should reject duplicate question_id in payload', () => {
    expect(() => {
      validateAnswerSet(
        [
          { question_id: 'q-1', answer_text: 'first' },
          { question_id: 'q-1', answer_text: 'second' },
        ],
        [TEXT_QUESTION, SCALE_QUESTION],
      );
    }).toThrow(BadRequestException);
  });

  it('should reject when an unrelated question_id is sent', () => {
    expect(() => {
      validateAnswerSet(
        [
          { question_id: 'q-unknown', answer_text: 'x' },
          { question_id: 'q-2', answer_numeric: 5 },
        ],
        [TEXT_QUESTION, SCALE_QUESTION],
      );
    }).toThrow(BadRequestException);
  });

  it('should reject when count does not match', () => {
    expect(() => {
      validateAnswerSet(
        [{ question_id: 'q-1', answer_text: 'hello' }],
        [TEXT_QUESTION, SCALE_QUESTION],
      );
    }).toThrow(BadRequestException);
  });
});
