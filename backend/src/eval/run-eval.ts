/* eslint-disable no-console */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { NestFactory } from "@nestjs/core";

import { EvalModule } from "./eval.module.js";
import { EvalService } from "./eval.service.js";

const SEPARATOR_LENGTH = 60;
const COL_DOMAIN = 20;
const COL_SCORE = 12;
const COL_BATCHES = 10;
const DECIMAL_PLACES = 2;

interface GoalSummary {
  domain: string;
  universalBatch: { overallComposite: number };
  aiBatches: Array<{ overallComposite: number }>;
  completedAtBatch: number;
  goldBatch: { overallComposite: number };
  delta: Record<string, number>;
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(EvalModule, {
    logger: ["log", "warn", "error"],
  });

  const evalService = app.get(EvalService);

  console.log("\nStarting Multi-Persona Prompt Evaluation...\n");

  const report = await evalService.runFullEval();
  const markdown = evalService.generateReport(report);

  const timestamp = report.timestamp.replace(/[:.]/g, "-");
  const reportPath = join(
    process.cwd(),
    "_bmad-output",
    `eval-report-${timestamp}.md`,
  );
  writeFileSync(reportPath, markdown, "utf-8");

  console.log(`\n${"=".repeat(SEPARATOR_LENGTH)}`);
  console.log("EVALUATION COMPLETE");
  console.log("=".repeat(SEPARATOR_LENGTH));
  console.log(`\nReport saved to: ${reportPath}\n`);

  printResultsTable(report.goals);

  await app.close();
}

function formatGoalRow(goal: GoalSummary): string {
  const uni = goal.universalBatch.overallComposite.toFixed(DECIMAL_PLACES);
  const aiAvg =
    goal.aiBatches.length > 0
      ? (
          goal.aiBatches.reduce((s, b) => s + b.overallComposite, 0) /
          goal.aiBatches.length
        ).toFixed(DECIMAL_PLACES)
      : "N/A";
  const batches =
    goal.aiBatches.length > 0
      ? `${goal.aiBatches.length}@${goal.completedAtBatch}`
      : "N/A";
  const gold = goal.goldBatch.overallComposite.toFixed(DECIMAL_PLACES);
  const deltaVals = Object.values(goal.delta);
  const deltaAvg =
    deltaVals.length > 0
      ? (deltaVals.reduce((a, b) => a + b, 0) / deltaVals.length).toFixed(
          DECIMAL_PLACES,
        )
      : "N/A";

  return (
    goal.domain.padEnd(COL_DOMAIN) +
    uni.padEnd(COL_SCORE) +
    aiAvg.padEnd(COL_SCORE) +
    batches.padEnd(COL_BATCHES) +
    gold.padEnd(COL_SCORE) +
    deltaAvg
  );
}

function printResultsTable(goals: GoalSummary[]): void {
  const header = `${
    "Domain".padEnd(COL_DOMAIN) +
    "Universal".padEnd(COL_SCORE) +
    "AI Avg".padEnd(COL_SCORE) +
    "Batches".padEnd(COL_BATCHES) +
    "Gold".padEnd(COL_SCORE)
  }Delta`;
  console.log(header);
  console.log("-".repeat(header.length));

  for (const goal of goals) {
    console.log(formatGoalRow(goal));
  }

  console.log("");
}

main().catch((error: unknown) => {
  console.error("Eval failed:", error);
  process.exit(1);
});
