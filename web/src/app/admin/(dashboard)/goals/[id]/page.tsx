import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ApiError } from "@/lib/admin-api/errors";
import {
  getGoal,
  getGoalCoachMemory,
  getGoalDebriefs,
  getGoalIntake,
  getGoalRoadmap,
  getGoalWeeklyTasks,
} from "@/lib/admin-api/resources/goals";
import type {
  AdminGoalCoachMemory,
  AdminGoalDebrief,
  AdminGoalDetail,
  AdminGoalIntakeBatch,
  AdminGoalRoadmap,
  AdminGoalWeeklyTask,
} from "@/lib/admin-api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/admin/empty-state";
import { JsonViewer } from "@/components/admin/json-viewer";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";

import { GoalDangerZone, GoalToolbar } from "./_components/goal-actions";
import { GoalTabs } from "./_components/goal-tabs";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let goal: AdminGoalDetail;
  let intake: AdminGoalIntakeBatch[];
  let roadmap: AdminGoalRoadmap;
  let weeklyTasks: AdminGoalWeeklyTask[];
  let debriefs: AdminGoalDebrief[];
  let coachMemory: AdminGoalCoachMemory[];
  try {
    [goal, intake, roadmap, weeklyTasks, debriefs, coachMemory] =
      await Promise.all([
        getGoal(id),
        getGoalIntake(id),
        getGoalRoadmap(id),
        getGoalWeeklyTasks(id),
        getGoalDebriefs(id),
        getGoalCoachMemory(id),
      ]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/admin/goals" />}
        className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Goals
      </Button>

      <PageHeader
        title={goal.title}
        description={`Goal ID: ${goal.id}`}
        actions={<GoalToolbar id={goal.id} />}
      />

      <GoalTabs
        overview={<OverviewTab goal={goal} />}
        intake={<IntakeTab batches={intake} />}
        roadmap={<RoadmapTab roadmap={roadmap} />}
        weeklyTasks={<WeeklyTasksTab tasks={weeklyTasks} />}
        debriefs={<DebriefsTab debriefs={debriefs} />}
        coachMemory={<CoachMemoryTab entries={coachMemory} />}
      />

      <GoalDangerZone id={goal.id} title={goal.title} />
    </div>
  );
}

function OverviewTab({ goal }: { goal: AdminGoalDetail }) {
  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-none">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Status" value={goal.status.replace(/_/g, " ")} />
          <Field
            label="Owner"
            value={
              <Link
                href={`/admin/users/${goal.userId}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {goal.userId}
              </Link>
            }
          />
          <Field label="Target date" value={formatDate(goal.targetDate)} />
          <Field label="Created" value={formatDate(goal.createdAt)} />
          <Field label="Updated" value={formatDate(goal.updatedAt)} />
          <Field label="Roadmap status" value={goal.roadmapStatus ?? "—"} />
          <Field label="Roadmap model" value={goal.roadmapModelUsed ?? "—"} />
          <Field
            label="Roadmap attempts"
            value={String(goal.roadmapGenerationAttempts)}
          />
          <Field
            label="Profile attempts"
            value={String(goal.profileGenerationAttempts)}
          />
          <Field
            label="Profile embedded"
            value={goal.profileEmbedded ? "Yes" : "No"}
          />
        </CardContent>
      </Card>
      {goal.description ? (
        <Card className="border-border/60 shadow-none">
          <CardContent className="space-y-2 p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {goal.description}
            </p>
          </CardContent>
        </Card>
      ) : null}
      {goal.narrativeSummary ? (
        <Card className="border-border/60 shadow-none">
          <CardContent className="space-y-2 p-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Narrative summary
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {goal.narrativeSummary}
            </p>
          </CardContent>
        </Card>
      ) : null}
      {goal.profileData !== null && goal.profileData !== undefined ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Profile data
          </p>
          <JsonViewer value={goal.profileData} />
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function IntakeTab({ batches }: { batches: AdminGoalIntakeBatch[] }) {
  if (batches.length === 0) {
    return (
      <EmptyState
        title="No intake yet"
        description="The user hasn't started intake for this goal."
      />
    );
  }
  return (
    <div className="space-y-3">
      {batches.map((batch) => (
        <Card key={batch.id} className="border-border/60 shadow-none">
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Batch #{batch.batchNumber}
                </span>
                <StatusBadge
                  variant={batch.isAnswered ? "active" : "pending"}
                  label={batch.isAnswered ? "Answered" : "Pending"}
                />
                {batch.embedded ? (
                  <StatusBadge variant="active" label="Embedded" />
                ) : null}
              </div>
            </div>
            <ol className="space-y-2 text-sm">
              {batch.questions.map((question) => (
                <li
                  key={question.id}
                  className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2"
                >
                  <p className="text-foreground">{question.questionText}</p>
                  <p className="mt-1 text-muted-foreground">
                    {question.answerText ??
                      (question.answerNumeric !== null
                        ? String(question.answerNumeric)
                        : "—")}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RoadmapTab({ roadmap }: { roadmap: AdminGoalRoadmap }) {
  if (!roadmap.status) {
    return (
      <EmptyState
        title="No roadmap yet"
        description="The roadmap hasn't been generated for this goal."
      />
    );
  }
  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-none">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Status" value={roadmap.status} />
          <Field label="Model" value={roadmap.modelUsed ?? "—"} />
          <Field label="Attempts" value={String(roadmap.generationAttempts)} />
          <Field label="Updated" value={formatDate(roadmap.updatedAt)} />
        </CardContent>
      </Card>
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Milestones ({roadmap.milestones.length})
        </p>
        <div className="space-y-2">
          {roadmap.milestones.map((milestone) => (
            <Card key={milestone.id} className="border-border/60 shadow-none">
              <CardContent className="space-y-1 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{milestone.title}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    M{milestone.targetMonth} W{milestone.targetWeek}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {milestone.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Weekly plans ({roadmap.weeklyPlans.length})
        </p>
        <div className="space-y-2">
          {roadmap.weeklyPlans.map((plan) => (
            <Card key={plan.id} className="border-border/60 shadow-none">
              <CardContent className="flex items-center justify-between p-4 text-sm">
                <span className="font-medium">Week {plan.weekNumber}</span>
                <span className="text-muted-foreground">{plan.status}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {plan.weekStartDate}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeeklyTasksTab({ tasks }: { tasks: AdminGoalWeeklyTask[] }) {
  if (tasks.length === 0) {
    return <EmptyState title="No weekly tasks yet" />;
  }
  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const isCompleted = task.completedAt !== null;
        return (
          <Card key={task.id} className="border-border/60 shadow-none">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="space-y-0.5">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Week {task.weekNumber}
                </span>
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-sm text-muted-foreground">
                  {task.description}
                </p>
              </div>
              <StatusBadge
                variant={isCompleted ? "active" : "pending"}
                label={isCompleted ? "Done" : "Open"}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DebriefsTab({ debriefs }: { debriefs: AdminGoalDebrief[] }) {
  if (debriefs.length === 0) {
    return <EmptyState title="No debriefs yet" />;
  }
  return (
    <div className="space-y-2">
      {debriefs.map((d) => (
        <Card key={d.id} className="border-border/60 shadow-none">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
              <span>{d.date}</span>
              <span>{formatDate(d.createdAt)}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{d.note}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CoachMemoryTab({ entries }: { entries: AdminGoalCoachMemory[] }) {
  if (entries.length === 0) {
    return <EmptyState title="No coach memory yet" />;
  }
  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <Card key={entry.id} className="border-border/60 shadow-none">
          <CardContent className="space-y-1 p-4">
            <p className="text-xs text-muted-foreground tabular-nums">
              {formatDate(entry.updatedAt)}
            </p>
            <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
