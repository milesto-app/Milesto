import { Injectable, Logger } from '@nestjs/common';
import { ALL_PERSONA_JUDGES, META_JUDGE_SYSTEM_PROMPT } from './personas.js';
import type { MetaJudgeResult, PersonaJudge, PersonaScores } from './personas.js';
import type { GoldStandard } from './gold-standards.js';
import type {
  BatchEvalResult,
  EvalBatchOptions,
  EvalPriorBatch,
  EvalQuestion,
} from './eval.types.js';
import {
  buildJudgeUserPrompt,
  buildSimulationSystemPrompt,
  buildSimulationUserPrompt,
  formatQuestions,
} from './eval-prompt.builder.js';
import { EvalScoringService } from './eval-scoring.service.js';

const SCORE_DECIMAL_PLACES = 2;

export interface SimulateAnswersInput {
  goalDescription: string;
  priorBatches: EvalPriorBatch[];
  questions: EvalQuestion[];
  batchNumber: number;
}

@Injectable()
export class EvalJudgeService {
  private readonly logger = new Logger(EvalJudgeService.name);

  constructor(private readonly scoringService: EvalScoringService) {}

  public async evaluateBatch(options: EvalBatchOptions): Promise<BatchEvalResult> {
    const judgeResults = await Promise.all(
      ALL_PERSONA_JUDGES.map(async (judge) => this.runPersonaJudge(judge, options)),
    );

    const personaScores = judgeResults.map((scores, i) => ({
      judge: ALL_PERSONA_JUDGES[i]?.name ?? 'Unknown',
      axis: ALL_PERSONA_JUDGES[i]?.axis ?? 'Unknown',
      scores,
    }));

    const metaJudge = await this.tryRunMetaJudge(options, personaScores);
    const compositeByAxis = this.scoringService.computeCompositeByAxis(personaScores);
    const overallComposite = this.scoringService.computeOverallComposite(compositeByAxis);

    return {
      label: options.label,
      questions: options.questions,
      personaScores,
      metaJudge,
      compositeByAxis,
      overallComposite,
    };
  }

  public async simulateUserAnswers(input: SimulateAnswersInput): Promise<EvalPriorBatch> {
    const systemPrompt = buildSimulationSystemPrompt();
    const userPrompt = buildSimulationUserPrompt(input);

    const answers = await this.scoringService.callJudgeWithRetry<
      Array<{ question_index: number; answer: string }>
    >(systemPrompt, userPrompt, `Answer Sim (Batch ${input.batchNumber})`);

    return {
      batch_number: input.batchNumber,
      questions: input.questions.map((q, i) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        answer: answers.find((a) => a.question_index === i + 1)?.answer ?? 'No answer provided',
      })),
    };
  }

  private async runPersonaJudge(
    persona: PersonaJudge,
    options: EvalBatchOptions,
  ): Promise<PersonaScores> {
    const goldRef = options.isGoldStandard ? null : (options.goldStandard as GoldStandard | null);
    const userPrompt = buildJudgeUserPrompt({
      goalDescription: options.goalDescription,
      questions: options.questions,
      goldStandard: goldRef,
      priorBatches: options.priorBatches,
    });

    const raw = await this.scoringService.callJudgeWithRetry<PersonaScores>(
      persona.systemPrompt,
      userPrompt,
      persona.name,
    );
    return this.scoringService.validateAndFixComposite(raw, persona.scoreFields, persona.name);
  }

  private async tryRunMetaJudge(
    options: EvalBatchOptions,
    personaScores: Array<{ judge: string; axis: string; scores: PersonaScores }>,
  ): Promise<MetaJudgeResult | null> {
    try {
      return await this.runMetaJudge(options.goalDescription, options.questions, personaScores);
    } catch (error) {
      this.logger.warn(
        `  Meta-judge failed for "${options.label}": ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async runMetaJudge(
    goalDescription: string,
    questions: EvalQuestion[],
    personaScores: Array<{ judge: string; axis: string; scores: PersonaScores }>,
  ): Promise<MetaJudgeResult> {
    const questionsFormatted = formatQuestions(questions);
    const scoresFormatted = personaScores
      .map(
        (ps) =>
          `### ${ps.judge} (${ps.axis})\n${JSON.stringify(ps.scores, null, SCORE_DECIMAL_PLACES)}`,
      )
      .join('\n\n');

    const userPrompt = `## Goal\n${goalDescription}\n\n## Batch Under Evaluation\n${questionsFormatted}\n\n## Judge Scores\n${scoresFormatted}\n\nSynthesize the above into your verdict.`;

    return this.scoringService.callJudgeWithRetry<MetaJudgeResult>(
      META_JUDGE_SYSTEM_PROMPT,
      userPrompt,
      'Meta-Judge',
    );
  }
}
