import {
  validateGoalProfile,
  validateSemantic,
} from './intake-batch-validator.js';

const semanticBatch = [
  {
    question_text: 'What is your main challenge?',
    question_type: 'text',
    config: null,
  },
  {
    question_text: 'How confident are you?',
    question_type: 'scale',
    config: { min: 1, max: 10, min_label: 'Low', max_label: 'High' },
  },
  {
    question_text: 'What is your preferred approach?',
    question_type: 'single_choice',
    config: { options: ['Structured', 'Flexible', 'Mixed'] },
  },
];

describe('validateSemantic', () => {
  it('should pass a valid batch', () => {
    const result = validateSemantic(semanticBatch);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail when a question doesn't end with ?", () => {
    const batch = [
      { ...semanticBatch[0], question_text: 'What is your main challenge' },
      semanticBatch[1],
      semanticBatch[2],
    ];
    expect(validateSemantic(batch).errors).toEqual(
      expect.arrayContaining([expect.stringContaining('must end with "?"')]),
    );
  });

  it('should fail on duplicate question_text (case-insensitive)', () => {
    const batch = [
      semanticBatch[0],
      {
        ...semanticBatch[1],
        question_text: 'what is your main challenge?',
        question_type: 'scale',
      },
      semanticBatch[2],
    ];
    expect(validateSemantic(batch).errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('duplicate question_text'),
      ]),
    );
  });

  it('should fail when choice has fewer than 2 distinct options', () => {
    const batch = [
      semanticBatch[0],
      semanticBatch[1],
      { ...semanticBatch[2], config: { options: ['OnlyOne'] } },
    ];
    expect(validateSemantic(batch).errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('at least 2 distinct options'),
      ]),
    );
  });

  it('should fail when all questions are the same type', () => {
    const batch = [
      { question_text: 'Q1?', question_type: 'text', config: null },
      { question_text: 'Q2?', question_type: 'text', config: null },
      { question_text: 'Q3?', question_type: 'text', config: null },
    ];
    expect(validateSemantic(batch).errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('at least 2 different question_types'),
      ]),
    );
  });
});

const validProfile = {
  current_state: 'Beginner runner with gym access',
  desired_state: 'Complete a full marathon',
  constraints: 'Limited to 10 hours per week',
  motivation: 'Health improvement',
  domain_context: 'Distance running and endurance training',
  narrative_summary:
    'You are a beginner runner looking to complete a marathon.',
};

describe('validateGoalProfile', () => {
  it('should pass valid profile', () => {
    expect(validateGoalProfile(validProfile).valid).toBe(true);
  });

  it('should fail when profile is null', () => {
    expect(validateGoalProfile(null).errors).toContain(
      'Profile is not an object',
    );
  });

  it('should fail when profile is a string', () => {
    expect(validateGoalProfile('not an object').errors).toContain(
      'Profile is not an object',
    );
  });

  it('should fail when profile is an array', () => {
    expect(validateGoalProfile([]).errors).toContain(
      'Profile is not an object',
    );
  });

  it('should fail when a required section is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { motivation, ...incomplete } = validProfile;
    expect(validateGoalProfile(incomplete).errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Missing required section: motivation'),
      ]),
    );
  });

  it('should fail when a section is empty string', () => {
    expect(
      validateGoalProfile({ ...validProfile, constraints: '' }).errors,
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('constraints must be a non-empty string'),
      ]),
    );
  });

  it('should fail when a section is not a string', () => {
    expect(
      validateGoalProfile({ ...validProfile, motivation: 42 }).errors,
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('motivation must be a non-empty string'),
      ]),
    );
  });

  it('should return all errors when multiple sections are invalid', () => {
    const result = validateGoalProfile({
      current_state: '',
      desired_state: 42,
    });
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('should pass when goal_specific_insights is absent', () => {
    expect(validateGoalProfile(validProfile).valid).toBe(true);
  });

  it('should pass when goal_specific_insights is a valid object', () => {
    const result = validateGoalProfile({
      ...validProfile,
      goal_specific_insights: { dietary_patterns: 'Tends to skip breakfast' },
    });
    expect(result.valid).toBe(true);
  });

  it('should fail when goal_specific_insights is an array', () => {
    expect(
      validateGoalProfile({
        ...validProfile,
        goal_specific_insights: ['not', 'an', 'object'],
      }).errors,
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('must be a non-array object'),
      ]),
    );
  });

  it('should fail when goal_specific_insights has empty string value', () => {
    const result = validateGoalProfile({
      ...validProfile,
      goal_specific_insights: { dietary_patterns: '' },
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'goal_specific_insights["dietary_patterns"] must be a non-empty string',
        ),
      ]),
    );
  });

  it('should fail when goal_specific_insights has non-string value', () => {
    const result = validateGoalProfile({
      ...validProfile,
      goal_specific_insights: { score: 42 },
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'goal_specific_insights["score"] must be a non-empty string',
        ),
      ]),
    );
  });

  it('should pass when goal_specific_insights is null', () => {
    expect(
      validateGoalProfile({ ...validProfile, goal_specific_insights: null })
        .valid,
    ).toBe(true);
  });
});
