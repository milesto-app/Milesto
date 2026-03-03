import { buildQualityUserPrompt, computeComposite } from './intake-quality-scoring.js';

const sampleQuestions = [
  { question_text: 'What is your goal?', question_type: 'text' },
  { question_text: 'How motivated are you?', question_type: 'scale' },
  { question_text: 'What approach do you prefer?', question_type: 'single_choice' },
];
const goalDescription = 'Run a marathon in under 4 hours';

describe('computeComposite', () => {
  it('should return composite as average of 4 component scores', () => {
    const result = computeComposite({
      relevance: 0.8,
      depth_progression: 0.6,
      dimension_coverage: 1.0,
      redundancy_avoidance: 0.6,
    });
    expect(result.composite).toBe(0.75);
    expect(result.relevance).toBe(0.8);
  });

  it('should clamp negative scores to 0', () => {
    const result = computeComposite({
      relevance: -0.5,
      depth_progression: 0.7,
      dimension_coverage: 0.9,
      redundancy_avoidance: -1.0,
    });
    expect(result.relevance).toBe(0);
    expect(result.redundancy_avoidance).toBe(0);
  });

  it('should clamp scores above 1 to 1', () => {
    const result = computeComposite({
      relevance: 1.5,
      depth_progression: 2.0,
      dimension_coverage: 0.9,
      redundancy_avoidance: 0.85,
    });
    expect(result.relevance).toBe(1);
    expect(result.depth_progression).toBe(1);
  });
});

describe('buildQualityUserPrompt', () => {
  it('should contain goal description and questions', () => {
    const prompt = buildQualityUserPrompt({
      questions: sampleQuestions,
      goalDescription,
      batchNumber: 1,
      priorQuestions: [],
    });
    expect(prompt).toContain(goalDescription);
    expect(prompt).toContain('What is your goal?');
    expect(prompt).toContain('Batch 1');
  });

  it('should include prior questions when available', () => {
    const priorQuestions = [
      { question_text: 'What is your current fitness level?', batch_number: 1 },
      { question_text: 'How often do you exercise?', batch_number: 1 },
    ];
    const prompt = buildQualityUserPrompt({
      questions: sampleQuestions,
      goalDescription,
      batchNumber: 2,
      priorQuestions,
    });
    expect(prompt).toContain('[Batch 1] What is your current fitness level?');
    expect(prompt).not.toContain('None (this is the first batch)');
  });

  it('should indicate first batch when no prior questions', () => {
    const prompt = buildQualityUserPrompt({
      questions: sampleQuestions,
      goalDescription,
      batchNumber: 1,
      priorQuestions: [],
    });
    expect(prompt).toContain('None (this is the first batch)');
  });
});
