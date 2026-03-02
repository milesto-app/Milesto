import { Injectable } from '@nestjs/common';
import type { EvalReport, GoalEvalResult, BatchEvalResult } from './eval.types.js';

const DECIMAL_PLACES = 2;
const AI_BATCH_START = 2;

@Injectable()
export class EvalReportService {
  public generateReport(report: EvalReport): string {
    const lines: string[] = [];
    lines.push(`# Prompt Eval Report — ${report.timestamp}`);
    lines.push('');

    this.appendSummaryTable(lines, report.goals);
    lines.push('---');
    lines.push('');
    lines.push('## Per-Goal Details');

    for (const goal of report.goals) {
      this.appendGoalDetail(lines, goal);
    }

    return lines.join('\n');
  }

  private appendSummaryTable(lines: string[], goals: GoalEvalResult[]): void {
    lines.push('## Summary');
    lines.push('');
    lines.push('| Domain | Universal | AI Avg | Batches | Gold Standard | AI vs Gold Delta |');
    lines.push('|--------|-----------|--------|---------|---------------|------------------|');

    for (const goal of goals) {
      const uniScore = goal.universalBatch.overallComposite.toFixed(DECIMAL_PLACES);
      const aiAvg = this.computeAiAvgString(goal);
      const batchCount =
        goal.aiBatches.length > 0
          ? `${goal.aiBatches.length} (done@${goal.completedAtBatch})`
          : 'N/A';
      const goldScore = goal.goldBatch.overallComposite.toFixed(DECIMAL_PLACES);
      const deltaAvg = this.computeDeltaAvgString(goal.delta);

      lines.push(
        `| ${goal.domain} | ${uniScore} | ${aiAvg} | ${batchCount} | ${goldScore} | ${deltaAvg} |`,
      );
    }
    lines.push('');
  }

  private appendGoalDetail(lines: string[], goal: GoalEvalResult): void {
    lines.push('');
    lines.push(`### ${goal.domain}: "${goal.goalDescription}"`);
    lines.push('');

    const axes = Object.keys(goal.goldBatch.compositeByAxis);
    this.appendProgressionTable(lines, goal, axes);
    this.appendMetaJudgeVerdicts(lines, goal);
  }

  private appendProgressionTable(lines: string[], goal: GoalEvalResult, axes: string[]): void {
    lines.push('#### Batch Progression');
    lines.push('');
    lines.push(`| Batch | ${axes.join(' | ')} | Composite |`);
    lines.push(`|-------|${axes.map(() => '------').join('|')}|-----------|`);

    const formatCols = (c: Record<string, number>): string =>
      axes.map((a) => (c[a] ?? 0).toFixed(DECIMAL_PLACES)).join(' | ');

    lines.push(
      `| Universal (1) | ${formatCols(goal.universalBatch.compositeByAxis)} | ${goal.universalBatch.overallComposite.toFixed(DECIMAL_PLACES)} |`,
    );

    for (const [i, batch] of goal.aiBatches.entries()) {
      lines.push(
        `| AI Batch ${i + AI_BATCH_START} | ${formatCols(batch.compositeByAxis)} | ${batch.overallComposite.toFixed(DECIMAL_PLACES)} |`,
      );
    }

    this.appendAiAverageRow(lines, goal.aiBatches, axes);
    lines.push(
      `| Gold Standard | ${formatCols(goal.goldBatch.compositeByAxis)} | ${goal.goldBatch.overallComposite.toFixed(DECIMAL_PLACES)} |`,
    );
    this.appendDeltaRow(lines, goal.delta, axes);
    lines.push('');
  }

  private appendAiAverageRow(lines: string[], aiBatches: BatchEvalResult[], axes: string[]): void {
    if (aiBatches.length === 0) {
      return;
    }
    const aiAvgCols = axes
      .map((a) => {
        const avg =
          aiBatches.reduce((s, b) => s + (b.compositeByAxis[a] ?? 0), 0) / aiBatches.length;
        return avg.toFixed(DECIMAL_PLACES);
      })
      .join(' | ');
    const aiOverallAvg = (
      aiBatches.reduce((s, b) => s + b.overallComposite, 0) / aiBatches.length
    ).toFixed(DECIMAL_PLACES);
    lines.push(`| **AI Average** | ${aiAvgCols} | ${aiOverallAvg} |`);
  }

  private appendDeltaRow(lines: string[], delta: Record<string, number>, axes: string[]): void {
    const deltaCols = axes
      .map((a) => {
        const d = delta[a] ?? 0;
        const sign = d >= 0 ? '+' : '';
        return `${sign}${d.toFixed(DECIMAL_PLACES)}`;
      })
      .join(' | ');
    const vals = Object.values(delta);
    const deltaOverall = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const deltaSign = deltaOverall >= 0 ? '+' : '';
    lines.push(
      `| **Delta** | ${deltaCols} | ${deltaSign}${deltaOverall.toFixed(DECIMAL_PLACES)} |`,
    );
  }

  private appendMetaJudgeVerdicts(lines: string[], goal: GoalEvalResult): void {
    const batchesForMeta = [
      { label: 'Universal Batch', data: goal.universalBatch },
      ...goal.aiBatches.map((b, i) => ({ label: `AI Batch ${i + AI_BATCH_START}`, data: b })),
      { label: 'Gold Standard', data: goal.goldBatch },
    ];

    for (const batch of batchesForMeta) {
      if (batch.data.metaJudge !== null) {
        this.appendSingleMetaVerdict(lines, batch.label, batch.data);
      }
    }
  }

  private appendSingleMetaVerdict(lines: string[], label: string, batch: BatchEvalResult): void {
    const mj = batch.metaJudge;
    if (mj === null) {
      return;
    }
    lines.push(`#### Meta-Judge: ${label}`);
    lines.push('');
    lines.push(`**Grade:** ${mj.overall_grade}`);
    lines.push('');
    lines.push(`**Personality:** ${mj.batch_personality}`);
    lines.push('');
    lines.push(`**Rationale:** ${mj.grade_rationale}`);
    lines.push('');
    lines.push(
      `**Weakest Question (#${mj.weakest_question.index}):** "${mj.weakest_question.original}"`,
    );
    lines.push(`> ${mj.weakest_question.reason}`);
    lines.push('');
    lines.push(`**Suggested Rewrite:** "${mj.weakest_question.improved_version}"`);
    lines.push(`> ${mj.weakest_question.improvement_rationale}`);
    lines.push('');
    lines.push(
      `**Strongest Question (#${mj.strongest_question.index}):** "${mj.strongest_question.original}"`,
    );
    lines.push(`> ${mj.strongest_question.reason}`);
    lines.push('');
    if (mj.missing_dimensions.length > 0) {
      lines.push(`**Missing Dimensions:** ${mj.missing_dimensions.join(', ')}`);
      lines.push('');
    }
  }

  private computeAiAvgString(goal: GoalEvalResult): string {
    if (goal.aiBatches.length === 0) {
      return 'N/A';
    }
    return (
      goal.aiBatches.reduce((s, b) => s + b.overallComposite, 0) / goal.aiBatches.length
    ).toFixed(DECIMAL_PLACES);
  }

  private computeDeltaAvgString(delta: Record<string, number>): string {
    const vals = Object.values(delta);
    if (vals.length === 0) {
      return 'N/A';
    }
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(DECIMAL_PLACES);
  }
}
