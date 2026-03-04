import { Injectable, Logger } from '@nestjs/common';

import { config } from '../config/app.config.js';
import type { PriorBatchContext } from '../intake/intake-prompt.service.js';
import { IntakePromptService } from '../intake/intake-prompt.service.js';
import type {
  BatchEvalResult,
  EvalPriorBatch,
  EvalReport,
  GoalEvalResult,
} from './eval.types.js';
import type { RawQuestion } from './eval.utils.js';
import { computeDeltas, mapToEvalQuestions } from './eval.utils.js';
import { EvalJudgeService } from './eval-judge.service.js';
import { EvalReportService } from './eval-report.service.js';
import type { GoldStandard } from './gold-standards.js';
import { GOLD_STANDARDS } from './gold-standards.js';

@Injectable()
export class EvalService {
  private readonly logger = new Logger(EvalService.name);

  constructor(
    private readonly judgeService: EvalJudgeService,
    private readonly reportService: EvalReportService,
    private readonly intakePromptService: IntakePromptService,
  ) {}

  public async runFullEval(): Promise<EvalReport> {
    const timestamp = new Date().toISOString();
    this.logger.log(
      `Running ${GOLD_STANDARDS.length} goal evaluations in parallel...`,
    );

    const goals = await Promise.all(
      GOLD_STANDARDS.map(async (gs) => {
        this.logger.log(`  Starting: ${gs.domain} — "${gs.goalDescription}"`);
        return this.evaluateGoal(gs);
      }),
    );

    return { timestamp, goals };
  }

  public generateReport(report: EvalReport): string {
    return this.reportService.generateReport(report);
  }

  private async evaluateGoal(gs: GoldStandard): Promise<GoalEvalResult> {
    const tag = `[${gs.domain}]`;

    const [universalBatch, aiLoopResult, goldBatch] = await Promise.all([
      this.judgeService.evaluateBatch({
        goalDescription: gs.goalDescription,
        questions: mapToEvalQuestions(
          this.intakePromptService.getUniversalBatch('en'),
        ),
        goldStandard: gs,
        label: `${tag} Universal Batch (Batch 1)`,
        priorBatches: null,
        isGoldStandard: false,
      }),
      this.runAiIntakeLoop(gs, tag),
      this.judgeService.evaluateBatch({
        goalDescription: gs.goalDescription,
        questions: mapToEvalQuestions(gs.questions),
        goldStandard: null,
        label: `${tag} Gold Standard Batch`,
        priorBatches: null,
        isGoldStandard: true,
      }),
    ]);

    const delta = computeDeltas(
      goldBatch,
      aiLoopResult.aiBatches,
      universalBatch,
    );
    this.logger.log(
      `${tag} Complete — ${aiLoopResult.aiBatches.length} AI batches, completed at batch ${aiLoopResult.completedAtBatch}`,
    );

    return {
      domain: gs.domain,
      goalDescription: gs.goalDescription,
      universalBatch,
      aiBatches: aiLoopResult.aiBatches,
      completedAtBatch: aiLoopResult.completedAtBatch,
      goldBatch,
      delta,
    };
  }

  private async runAiIntakeLoop(
    gs: GoldStandard,
    tag: string,
  ): Promise<{ aiBatches: BatchEvalResult[]; completedAtBatch: number }> {
    const aiBatches: BatchEvalResult[] = [];
    const priorBatches: PriorBatchContext[] = [gs.simulatedBatch1Answers];
    let completedAtBatch = config.intake.maxBatches;

    for (let batchNum = 2; batchNum <= config.intake.maxBatches; batchNum++) {
      const result = await this.processAiBatch(gs, tag, priorBatches, batchNum);
      if (result === null) {
        completedAtBatch = batchNum;
        break;
      }
      aiBatches.push(result.evalResult);
      priorBatches.push(result.simulatedAnswers);
    }

    return { aiBatches, completedAtBatch };
  }

  private async processAiBatch(
    gs: GoldStandard,
    tag: string,
    priorBatches: PriorBatchContext[],
    batchNum: number,
  ): Promise<{
    evalResult: BatchEvalResult;
    simulatedAnswers: EvalPriorBatch;
  } | null> {
    try {
      this.logger.log(`${tag} Generating AI batch ${batchNum}...`);
      const generated = await this.intakePromptService.generateNextBatch({
        goalDescription: gs.goalDescription,
        priorBatches,
        batchNumber: batchNum,
        language: 'en',
      });

      if (generated.is_complete || generated.questions.length === 0) {
        this.logger.log(`${tag} AI signaled completion at batch ${batchNum}`);
        return null;
      }

      return await this.evaluateGeneratedBatch(
        gs,
        tag,
        priorBatches,
        generated.questions,
        batchNum,
      );
    } catch (error) {
      this.logger.warn(
        `${tag} AI batch ${batchNum} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async evaluateGeneratedBatch(
    gs: GoldStandard,
    tag: string,
    priorBatches: PriorBatchContext[],
    rawQuestions: RawQuestion[],
    batchNum: number,
  ): Promise<{
    evalResult: BatchEvalResult;
    simulatedAnswers: EvalPriorBatch;
  }> {
    const aiQuestions = mapToEvalQuestions(rawQuestions);
    const [evalResult, simulatedAnswers] = await Promise.all([
      this.judgeService.evaluateBatch({
        goalDescription: gs.goalDescription,
        questions: aiQuestions,
        goldStandard: gs,
        label: `${tag} AI Batch ${batchNum}`,
        priorBatches: priorBatches as EvalPriorBatch[],
        isGoldStandard: false,
      }),
      this.judgeService.simulateUserAnswers({
        goalDescription: gs.goalDescription,
        priorBatches: priorBatches as EvalPriorBatch[],
        questions: aiQuestions,
        batchNumber: batchNum,
      }),
    ]);
    return { evalResult, simulatedAnswers };
  }
}
