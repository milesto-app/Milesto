import { validateStructural } from './intake-structure-validator.js';

const validBatch = [
  {
    question_text: 'What is your main challenge?',
    question_type: 'text',
    config: null,
    order_in_batch: 1,
  },
  {
    question_text: 'How confident are you?',
    question_type: 'scale',
    config: { min: 1, max: 10, min_label: 'Low', max_label: 'High' },
    order_in_batch: 2,
  },
  {
    question_text: 'What is your preferred approach?',
    question_type: 'single_choice',
    config: { options: ['Structured', 'Flexible', 'Mixed'] },
    order_in_batch: 3,
  },
];

describe('validateStructural', () => {
  it('should pass a valid batch of 3-5 questions', () => {
    const result = validateStructural(validBatch);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail when fewer than 3 items', () => {
    const result = validateStructural(validBatch.slice(0, 2));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/Expected 3-5 questions/);
  });

  it('should fail when more than 5 items', () => {
    const sixQuestions = [
      ...validBatch,
      {
        question_text: 'Q4?',
        question_type: 'text',
        config: null,
        order_in_batch: 4,
      },
      {
        question_text: 'Q5?',
        question_type: 'text',
        config: null,
        order_in_batch: 5,
      },
      {
        question_text: 'Q6?',
        question_type: 'text',
        config: null,
        order_in_batch: 6,
      },
    ];
    expect(validateStructural(sixQuestions).valid).toBe(false);
  });

  it('should fail when question_text is empty', () => {
    const batch = [
      { ...validBatch[0], question_text: '' },
      validBatch[1],
      validBatch[2],
    ];
    const result = validateStructural(batch);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('missing or empty question_text'),
      ]),
    );
  });

  it('should fail when question_type is invalid', () => {
    const batch = [
      { ...validBatch[0], question_type: 'invalid_type' },
      validBatch[1],
      validBatch[2],
    ];
    const result = validateStructural(batch);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('invalid question_type'),
      ]),
    );
  });

  it('should fail when scale config is missing min or max', () => {
    const batch = [
      validBatch[0],
      { ...validBatch[1], config: { min_label: 'Low' } },
      validBatch[2],
    ];
    const result = validateStructural(batch);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('scale question config must have min and max'),
      ]),
    );
  });

  it('should fail when choice config is missing options', () => {
    const batch = [
      validBatch[0],
      validBatch[1],
      { ...validBatch[2], config: { notOptions: true } },
    ];
    const result = validateStructural(batch);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'choice question config must have options array',
        ),
      ]),
    );
  });

  it('should fail when order_in_batch is not sequential', () => {
    const batch = [
      { ...validBatch[0], order_in_batch: 1 },
      { ...validBatch[1], order_in_batch: 3 },
      { ...validBatch[2], order_in_batch: 2 },
    ];
    const result = validateStructural(batch);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('order_in_batch should be'),
      ]),
    );
  });
});
