import Foundation

@MainActor
final class RoadmapRepository {
    private let remote: RoadmapRemote
    private let goals: GoalRepository

    init(goals: GoalRepository) {
        remote = RoadmapRemote()
        self.goals = goals
    }

    func fetchRoadmap(goalId: String, userId: String?) async throws -> RoadmapSnapshot {
        let dto = try await remote.getRoadmap(goalId: goalId)
        let goal = try? await goals.fetchGoal(goalId: goalId)
        let switchable: [GoalSummary]
        if let userId {
            switchable = (try? await goals.fetchSwitchableGoals(userId: userId)) ?? []
        } else {
            switchable = []
        }
        return RoadmapSnapshot(
            goalTitle: goal?.title,
            goalTargetDate: goal?.targetDate,
            switchableGoals: switchable,
            currentMilestoneId: dto.currentMilestoneId,
            milestones: (dto.milestones ?? [])
                .sorted { $0.orderIndex < $1.orderIndex }
                .map(MilestoneRecord.init(remote:))
        )
    }

    func fetchRoadmapStatus(goalId: String) async throws -> RoadmapStatus {
        try await remote.getRoadmap(goalId: goalId).status
    }

    func generateRoadmap(goalId: String) async throws {
        _ = try await remote.generateRoadmap(goalId: goalId)
    }

    func tasksForMilestone(milestoneId: String) async throws -> [WeeklyTask] {
        try await remote.getTasksForMilestone(milestoneId: milestoneId)
    }

    func toggleTask(taskId: String, goalId: String, isCompleted: Bool) async throws -> WeeklyTask {
        try await remote.toggleTask(goalId: goalId, taskId: taskId, isCompleted: isCompleted)
    }

    func fetchWeeklyTasks(goalId: String) async throws -> [WeeklyTask] {
        try await remote.getWeeklyTasks(goalId: goalId)
    }

    func fetchWeeklyPlan(goalId: String) async throws -> WeeklyPlan? {
        if let existing = try? await remote.getWeeklyPlan(goalId: goalId) {
            return existing
        }
        return try? await remote.generateWeeklyPlan(goalId: goalId)
    }

    func fetchLatestDebrief(goalId: String) async throws -> Debrief? {
        let history = try await remote.getDebriefHistory(goalId: goalId)
        return history.first
    }

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String) async throws -> Debrief {
        try await remote.submitDebrief(goalId: goalId, weeklyPlanId: weeklyPlanId, note: note)
    }

    func generateWeeklyPlan(goalId: String) async throws {
        _ = try await remote.generateWeeklyPlan(goalId: goalId)
    }

    func waitForGeneratedTasks(goalId: String) async -> Bool {
        for _ in 0 ..< 30 {
            try? await Task.sleep(for: .seconds(2))
            if let tasks = try? await remote.getWeeklyTasks(goalId: goalId), !tasks.isEmpty {
                return true
            }
        }
        return false
    }

    func fetchDebriefPromptState(goalId: String) async throws -> DebriefPromptState {
        async let tasksAsync = remote.getWeeklyTasks(goalId: goalId)
        async let planAsync = fetchWeeklyPlan(goalId: goalId)
        async let debriefAsync = fetchLatestDebrief(goalId: goalId)
        let tasks = (try? await tasksAsync) ?? []
        let plan = try? await planAsync
        let latest = try? await debriefAsync
        return debriefPromptState(tasks: tasks, plan: plan ?? nil, latest: latest ?? nil)
    }

    func sortedTasks(_ tasks: [WeeklyTask]) -> [WeeklyTask] {
        tasks.sorted {
            if $0.isCompleted != $1.isCompleted { return !$0.isCompleted }
            return $0.orderIndex < $1.orderIndex
        }
    }

    func applyOptimisticCompletion(
        task: WeeklyTask,
        isCompleted: Bool,
        in tasks: inout [WeeklyTask]
    ) -> WeeklyTask? {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return nil }
        let original = tasks[index]
        tasks[index] = original.with(isCompleted: isCompleted)
        return original
    }

    private func debriefPromptState(tasks: [WeeklyTask], plan: WeeklyPlan?, latest: Debrief?) -> DebriefPromptState {
        let allComplete = !tasks.isEmpty && tasks.allSatisfy(\.isCompleted)
        let debriefMissingForCurrentPlan = latest?.weeklyPlanId != plan?.id
        return DebriefPromptState(
            weeklyPlanId: plan?.id,
            shouldDisplay: allComplete && debriefMissingForCurrentPlan && plan != nil
        )
    }
}

extension WeeklyTask {
    func with(isCompleted: Bool) -> WeeklyTask {
        WeeklyTask(
            id: id,
            weeklyPlanId: weeklyPlanId,
            goalId: goalId,
            userId: userId,
            title: title,
            description: description,
            estimatedMinutes: estimatedMinutes,
            orderIndex: orderIndex,
            isCompleted: isCompleted,
            isFallback: isFallback,
            createdAt: createdAt
        )
    }
}

extension MilestoneRecord {
    init(remote: MilestoneDTO) {
        self.init(
            id: remote.id,
            title: remote.title,
            description: remote.description,
            expectedOutcome: remote.expectedOutcome,
            targetMonth: remote.targetMonth,
            targetWeek: remote.targetWeek,
            orderIndex: remote.orderIndex
        )
    }
}
