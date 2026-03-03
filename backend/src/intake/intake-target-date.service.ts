import { Injectable, Logger } from '@nestjs/common';
import { GoalService } from '../goal/goal.service.js';
import type { AnswerInput } from './types/intake.types.js';
import type { QuestionConfig } from './intake-store.service.js';

@Injectable()
export class IntakeTargetDateService {
  private readonly logger = new Logger(IntakeTargetDateService.name);

  constructor(private readonly goalService: GoalService) {}

  public async tryExtractTargetDate(
    goalId: string,
    questions: Array<{ id: string; question_type: string; config: QuestionConfig | null }>,
    answers: AnswerInput[],
  ): Promise<void> {
    const dateQuestion = questions.find((q) => q.config?.format === 'date');
    if (dateQuestion === undefined) {
      return;
    }
    const dateAnswer = answers.find((a) => a.question_id === dateQuestion.id);
    if (dateAnswer?.answer_text === undefined || dateAnswer.answer_text.length === 0) {
      return;
    }
    try {
      await this.goalService.setTargetDate(goalId, dateAnswer.answer_text);
    } catch (error) {
      this.logger.warn(
        `Failed to set target date for goal ${goalId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
