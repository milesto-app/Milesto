import type {
  MonthlySummary,
  WeeklySummary,
} from './types/weekly-plan.types.js';

export function formatSummaryForEmbedding(
  summary: WeeklySummary,
  weekNumber: number,
): string {
  const lines = [
    `Weekly Summary (Week ${String(weekNumber)}):`,
    `Completion: ${String(summary.tasks_completed)}/${String(summary.tasks_total)} (${String(summary.completion_rate)}%)`,
    `Debriefs: ${String(summary.debrief_count ?? 0)}`,
  ];
  if (summary.narrative !== undefined && summary.narrative.length > 0) {
    lines.push(summary.narrative);
  }
  return lines.join('\n');
}

export function formatMonthlySummaryForEmbedding(
  summary: MonthlySummary,
  targetMonth: number,
): string {
  const lines = [
    `Monthly Summary (Month ${String(targetMonth)}):`,
    `Completion: ${String(summary.tasks_completed)}/${String(summary.tasks_total)} (${String(summary.completion_rate)}%)`,
    `Debriefs: ${String(summary.debrief_count)}`,
  ];
  if (summary.narrative !== undefined && summary.narrative.length > 0) {
    lines.push(summary.narrative);
  }
  return lines.join('\n');
}
