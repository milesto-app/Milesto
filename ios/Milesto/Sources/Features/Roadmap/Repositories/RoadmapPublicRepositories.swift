import Foundation

struct RoadmapSnapshot {
    var goalTitle: String?
    var goalTargetDate: Date?
    var switchableGoals: [GoalSummary]
    var currentMilestoneId: String?
    var milestones: [MilestoneRecord]
}

struct MilestoneRecord: Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    let expectedOutcome: String
    let targetMonth: Int
    let targetWeek: Int
    let isMonthlyCheckpoint: Bool
    let orderIndex: Int
}

@MainActor
protocol RoadmapSummaryRepository: AnyObject {
    func loadRoadmapSnapshot(goalId: String) -> RoadmapSnapshot
    func refreshRoadmap(goalId: String) async -> RoadmapSnapshot
    func currentTaskProgress(goalId: String) -> Double
    func generateRoadmap(goalId: String) async throws
    func fetchRoadmapStatus(goalId: String) async throws -> RoadmapStatus
}

@MainActor
protocol WeeklyTaskRepository: AnyObject {
    func tasksForMilestone(milestoneId: String) async throws -> [WeeklyTask]
    func toggleTask(taskId: String, goalId: String, isCompleted: Bool) async throws -> WeeklyTask
    func saveTask(_ task: WeeklyTask)
    func sortedTasks(_ tasks: [WeeklyTask]) -> [WeeklyTask]
    func applyOptimisticCompletion(
        task: WeeklyTask,
        isCompleted: Bool,
        in tasks: inout [WeeklyTask]
    ) -> WeeklyTask?
    func loadWeeklyTasks(goalId: String) -> [WeeklyTask]
    func refreshWeeklyTasks(goalId: String) async throws -> [WeeklyTask]
}

@MainActor
protocol WeeklyPlanRepository: AnyObject {
    func loadWeeklyPlan(goalId: String) -> WeeklyPlan?
    func refreshWeeklyPlan(goalId: String) async -> WeeklyPlan?
    func generateWeeklyPlan(goalId: String) async throws
    func waitForGeneratedTasks(goalId: String) async -> Bool
}

struct DebriefPromptState {
    let weeklyPlanId: String?
    let shouldDisplay: Bool
}

@MainActor
protocol DebriefRepository: AnyObject {
    func submitDebrief(goalId: String, weeklyPlanId: String, note: String) async throws -> Debrief
    func loadDebriefPromptState(goalId: String) -> DebriefPromptState
    func refreshDebriefPromptState(goalId: String) async -> DebriefPromptState
}
