import Foundation
import OSLog
import SwiftData

private let roadmapLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto", category: "Roadmap")

@MainActor
final class SyncingRoadmapRepository: RoadmapSummaryRepository, WeeklyTaskRepository, WeeklyPlanRepository, DebriefRepository {
    private let remote: any RemoteRoadmapRepository
    private let goals: any GoalRepository
    private let context: ModelContext

    init(
        modelContext: ModelContext,
        goals: any GoalRepository,
        remote: any RemoteRoadmapRepository = SupabaseRoadmapRepository()
    ) {
        self.remote = remote
        self.goals = goals
        context = modelContext
    }

    func loadRoadmapSnapshot(goalId: String) -> RoadmapSnapshot {
        RoadmapSnapshot(
            goalTitle: fetchGoalTitle(goalId: goalId),
            goalTargetDate: fetchGoalTargetDate(goalId: goalId),
            switchableGoals: fetchSwitchableGoals(),
            currentMilestoneId: fetchRoadmap(goalId: goalId)?.currentMilestoneId,
            milestones: fetchMilestoneRecords(goalId: goalId)
        )
    }

    func refreshRoadmap(goalId: String) async -> RoadmapSnapshot {
        var snapshot = loadRoadmapSnapshot(goalId: goalId)
        do {
            let remote = try await remote.getRoadmap(goalId: goalId)
            saveRoadmap(remote)
            try? context.save()
            await refreshTasksForProgress(goalId: goalId)

            snapshot.currentMilestoneId = remote.currentMilestoneId
            snapshot.milestones = (remote.milestones ?? [])
                .sorted { $0.orderIndex < $1.orderIndex }
                .map(MilestoneRecord.init(remote:))
            snapshot.goalTitle = fetchGoalTitle(goalId: goalId)
            snapshot.goalTargetDate = fetchGoalTargetDate(goalId: goalId)
            snapshot.switchableGoals = fetchSwitchableGoals()
        } catch {
            roadmapLogger.error("refreshRoadmap remote fetch failed; serving local SwiftData snapshot: \(String(describing: error), privacy: .public)")
        }
        return snapshot
    }

    func currentTaskProgress(goalId: String) -> Double {
        if let activePlanId = fetchActiveWeeklyPlanId(goalId: goalId) {
            return taskProgressForPlan(activePlanId)
        }
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        guard let tasks = try? context.fetch(descriptor), !tasks.isEmpty else { return 0 }
        return progress(of: tasks)
    }

    func tasksForMilestone(milestoneId: String) async throws -> [WeeklyTask] {
        try await remote.getTasksForMilestone(milestoneId: milestoneId)
    }

    func toggleTask(taskId: String, goalId: String, isCompleted: Bool) async throws -> WeeklyTask {
        let updated = try await remote.toggleTask(goalId: goalId, taskId: taskId, isCompleted: isCompleted)
        saveTask(updated)
        return updated
    }

    func saveTask(_ task: WeeklyTask) {
        let id = task.id
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.id == id }
        )
        if let local = try? context.fetch(descriptor).first {
            local.weeklyPlanId = task.weeklyPlanId
            local.title = task.title
            local.taskDescription = task.description
            local.estimatedMinutes = task.estimatedMinutes
            local.orderIndex = task.orderIndex
            local.isCompleted = task.isCompleted
            local.isFallback = task.isFallback
        } else {
            context.insert(LocalWeeklyTask(
                id: task.id,
                weeklyPlanId: task.weeklyPlanId,
                goalId: task.goalId,
                userId: task.userId,
                title: task.title,
                taskDescription: task.description,
                estimatedMinutes: task.estimatedMinutes,
                orderIndex: task.orderIndex,
                isCompleted: task.isCompleted,
                isFallback: task.isFallback,
                createdAt: task.createdAt
            ))
        }
        try? context.save()
        NotificationCenter.default.post(
            name: .weeklyTaskCompletionDidChange,
            object: nil,
            userInfo: ["goalId": task.goalId]
        )
    }

    func generateRoadmap(goalId: String) async throws {
        _ = try await remote.generateRoadmap(goalId: goalId)
    }

    func fetchRoadmapStatus(goalId: String) async throws -> RoadmapStatus {
        let remote = try await remote.getRoadmap(goalId: goalId)
        saveRoadmap(remote)
        try? context.save()
        return remote.status
    }

    func loadWeeklyTasks(goalId: String) -> [WeeklyTask] {
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.orderIndex)]
        )
        guard let localTasks = try? context.fetch(descriptor) else { return [] }
        return localTasks.map { local in
            WeeklyTask(
                id: local.id,
                weeklyPlanId: local.weeklyPlanId,
                goalId: local.goalId,
                userId: local.userId,
                title: local.title,
                description: local.taskDescription,
                estimatedMinutes: local.estimatedMinutes,
                orderIndex: local.orderIndex,
                isCompleted: local.isCompleted,
                isFallback: local.isFallback,
                createdAt: local.createdAt
            )
        }
    }

    func refreshWeeklyTasks(goalId: String) async throws -> [WeeklyTask] {
        let fetched = try await remote.getWeeklyTasks(goalId: goalId)
        replaceWeeklyTasks(fetched, goalId: goalId)
        try? context.save()
        return fetched
    }

    func loadWeeklyPlan(goalId: String) -> WeeklyPlan? {
        let activeStatus = WeeklyPlanStatus.active.rawValue
        let descriptor = FetchDescriptor<LocalWeeklyPlan>(
            predicate: #Predicate { $0.goalId == goalId && $0.status == activeStatus }
        )
        guard let local = try? context.fetch(descriptor).first else { return nil }
        return WeeklyPlan(
            id: local.id,
            milestoneId: local.milestoneId,
            goalId: local.goalId,
            userId: local.userId,
            weekNumber: local.weekNumber,
            weekStartDate: local.weekStartDate,
            objectives: local.objectives,
            summary: local.summary,
            status: local.weeklyPlanStatus,
            isFallback: local.isFallback,
            createdAt: local.createdAt
        )
    }

    func refreshWeeklyPlan(goalId: String) async -> WeeklyPlan? {
        let plan: WeeklyPlan?
        if let existing = try? await remote.getWeeklyPlan(goalId: goalId) {
            plan = existing
        } else {
            plan = try? await remote.generateWeeklyPlan(goalId: goalId)
        }
        if let plan {
            saveWeeklyPlan(plan)
            try? context.save()
        }
        return plan
    }

    func loadLatestDebrief(goalId: String) -> Debrief? {
        let descriptor = FetchDescriptor<LocalDebrief>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        guard let local = try? context.fetch(descriptor).first else { return nil }
        return Debrief(
            id: local.id,
            goalId: local.goalId,
            userId: local.userId,
            weeklyPlanId: local.weeklyPlanId,
            date: local.date,
            note: local.note,
            createdAt: local.createdAt
        )
    }

    func refreshLatestDebrief(goalId: String) async -> Debrief? {
        guard let history = try? await remote.getDebriefHistory(goalId: goalId),
              let latest = history.first
        else { return nil }
        saveDebrief(latest)
        try? context.save()
        return latest
    }

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String) async throws -> Debrief {
        let remote = try await remote.submitDebrief(
            goalId: goalId,
            weeklyPlanId: weeklyPlanId,
            note: note
        )
        saveDebrief(remote)
        try? context.save()
        return remote
    }

    func generateWeeklyPlan(goalId: String) async throws {
        _ = try await remote.generateWeeklyPlan(goalId: goalId)
    }

    func waitForGeneratedTasks(goalId: String) async -> Bool {
        for _ in 0 ..< 30 {
            try? await Task.sleep(for: .seconds(2))
            if let tasks = try? await remote.getWeeklyTasks(goalId: goalId), !tasks.isEmpty {
                replaceWeeklyTasks(tasks, goalId: goalId)
                try? context.save()
                return true
            }
        }
        return false
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
        let optimistic = original.with(isCompleted: isCompleted)
        tasks[index] = optimistic
        saveTask(optimistic)
        return original
    }

    func loadDebriefPromptState(goalId: String) -> DebriefPromptState {
        let tasks = loadWeeklyTasks(goalId: goalId)
        let plan = loadWeeklyPlan(goalId: goalId)
        let latest = loadLatestDebrief(goalId: goalId)
        return debriefPromptState(tasks: tasks, plan: plan, latest: latest)
    }

    func refreshDebriefPromptState(goalId: String) async -> DebriefPromptState {
        async let tasks = refreshWeeklyTasks(goalId: goalId)
        async let plan = refreshWeeklyPlan(goalId: goalId)
        async let debrief = refreshLatestDebrief(goalId: goalId)
        _ = try? await tasks
        let refreshedPlan = await plan
        let refreshedDebrief = await debrief
        return debriefPromptState(
            tasks: loadWeeklyTasks(goalId: goalId),
            plan: refreshedPlan ?? loadWeeklyPlan(goalId: goalId),
            latest: refreshedDebrief ?? loadLatestDebrief(goalId: goalId)
        )
    }

    private func saveWeeklyPlan(_ remote: WeeklyPlan) {
        let planId = remote.id
        let descriptor = FetchDescriptor<LocalWeeklyPlan>(
            predicate: #Predicate { $0.id == planId }
        )
        if let existing = try? context.fetch(descriptor).first {
            existing.milestoneId = remote.milestoneId
            existing.weekNumber = remote.weekNumber
            existing.weekStartDate = remote.weekStartDate
            existing.objectives = remote.objectives
            existing.status = remote.status.rawValue
            existing.isFallback = remote.isFallback
            existing.summaryCompletionRate = remote.summary?.completionRate
            existing.summaryTasksCompleted = remote.summary?.tasksCompleted
            existing.summaryTasksTotal = remote.summary?.tasksTotal
            existing.summaryDebriefCount = remote.summary?.debriefCount
            existing.summaryNarrative = remote.summary?.narrative
        } else {
            context.insert(LocalWeeklyPlan(
                id: remote.id,
                milestoneId: remote.milestoneId,
                goalId: remote.goalId,
                userId: remote.userId,
                weekNumber: remote.weekNumber,
                weekStartDate: remote.weekStartDate,
                objectives: remote.objectives,
                status: remote.status.rawValue,
                isFallback: remote.isFallback,
                createdAt: remote.createdAt,
                summary: remote.summary
            ))
        }
    }

    private func saveDebrief(_ remote: Debrief) {
        let debriefId = remote.id
        let descriptor = FetchDescriptor<LocalDebrief>(
            predicate: #Predicate { $0.id == debriefId }
        )
        let existing = try? context.fetch(descriptor).first

        if let existing {
            existing.update(with: remote)
        } else {
            context.insert(LocalDebrief(
                id: remote.id,
                goalId: remote.goalId,
                userId: remote.userId,
                weeklyPlanId: remote.weeklyPlanId,
                date: remote.date,
                note: remote.note,
                createdAt: remote.createdAt
            ))
        }
    }

    private func refreshTasksForProgress(goalId: String) async {
        guard let fetched = try? await remote.getWeeklyTasks(goalId: goalId) else { return }
        replaceWeeklyTasks(fetched, goalId: goalId)
        try? context.save()
    }

    private func fetchGoalTitle(goalId: String) -> String? {
        goals.loadGoal(goalId: goalId)?.title
    }

    private func fetchGoalTargetDate(goalId: String) -> Date? {
        goals.loadGoal(goalId: goalId)?.targetDate
    }

    private func fetchSwitchableGoals() -> [GoalSummary] {
        goals.loadSwitchableGoals()
    }

    private func fetchRoadmap(goalId: String) -> LocalRoadmap? {
        let descriptor = FetchDescriptor<LocalRoadmap>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        return try? context.fetch(descriptor).first
    }

    private func fetchMilestoneRecords(goalId: String) -> [MilestoneRecord] {
        guard let roadmap = fetchRoadmap(goalId: goalId), !roadmap.milestones.isEmpty else { return [] }
        return roadmap.milestones
            .sorted { $0.orderIndex < $1.orderIndex }
            .map { MilestoneRecord(local: $0) }
    }

    private func saveRoadmap(_ remote: RemoteRoadmap) {
        let goalId = remote.goalId
        let descriptor = FetchDescriptor<LocalRoadmap>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        if let existing = try? context.fetch(descriptor).first {
            existing.status = remote.status.rawValue
            existing.updatedAt = remote.updatedAt
            existing.currentMilestoneId = remote.currentMilestoneId

            if let remotes = remote.milestones {
                let existingById = Dictionary(uniqueKeysWithValues: existing.milestones.map { ($0.id, $0) })
                let remoteIds = Set(remotes.map(\.id))

                for remoteMilestone in remotes {
                    if let local = existingById[remoteMilestone.id] {
                        local.title = remoteMilestone.title
                        local.milestoneDescription = remoteMilestone.description
                        local.expectedOutcome = remoteMilestone.expectedOutcome
                        local.targetMonth = remoteMilestone.targetMonth
                        local.targetWeek = remoteMilestone.targetWeek
                        local.isMonthlyCheckpoint = remoteMilestone.isMonthlyCheckpoint
                        local.orderIndex = remoteMilestone.orderIndex
                    } else {
                        let local = LocalMilestone(
                            id: remoteMilestone.id,
                            goalId: remoteMilestone.goalId,
                            orderIndex: remoteMilestone.orderIndex,
                            title: remoteMilestone.title,
                            milestoneDescription: remoteMilestone.description,
                            expectedOutcome: remoteMilestone.expectedOutcome,
                            targetMonth: remoteMilestone.targetMonth,
                            targetWeek: remoteMilestone.targetWeek,
                            isMonthlyCheckpoint: remoteMilestone.isMonthlyCheckpoint,
                            createdAt: remoteMilestone.createdAt
                        )
                        local.roadmap = existing
                        existing.milestones.append(local)
                    }
                }

                for local in existing.milestones where !remoteIds.contains(local.id) {
                    context.delete(local)
                }
            }
        } else {
            let localMilestones = (remote.milestones ?? []).map { remoteMilestone in
                LocalMilestone(
                    id: remoteMilestone.id,
                    goalId: remoteMilestone.goalId,
                    orderIndex: remoteMilestone.orderIndex,
                    title: remoteMilestone.title,
                    milestoneDescription: remoteMilestone.description,
                    expectedOutcome: remoteMilestone.expectedOutcome,
                    targetMonth: remoteMilestone.targetMonth,
                    targetWeek: remoteMilestone.targetWeek,
                    isMonthlyCheckpoint: remoteMilestone.isMonthlyCheckpoint,
                    createdAt: remoteMilestone.createdAt
                )
            }
            context.insert(LocalRoadmap(
                goalId: remote.goalId,
                userId: remote.userId,
                status: remote.status.rawValue,
                createdAt: remote.createdAt,
                updatedAt: remote.updatedAt,
                currentMilestoneId: remote.currentMilestoneId,
                milestones: localMilestones
            ))
        }
    }

    private func replaceWeeklyTasks(_ remotes: [WeeklyTask], goalId: String) {
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        let existing = (try? context.fetch(descriptor)) ?? []
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })
        let remoteIds = Set(remotes.map(\.id))

        for remote in remotes {
            if let local = existingById[remote.id] {
                local.weeklyPlanId = remote.weeklyPlanId
                local.title = remote.title
                local.taskDescription = remote.description
                local.estimatedMinutes = remote.estimatedMinutes
                local.orderIndex = remote.orderIndex
                local.isCompleted = remote.isCompleted
                local.isFallback = remote.isFallback
            } else {
                context.insert(LocalWeeklyTask(
                    id: remote.id,
                    weeklyPlanId: remote.weeklyPlanId,
                    goalId: remote.goalId,
                    userId: remote.userId,
                    title: remote.title,
                    taskDescription: remote.description,
                    estimatedMinutes: remote.estimatedMinutes,
                    orderIndex: remote.orderIndex,
                    isCompleted: remote.isCompleted,
                    isFallback: remote.isFallback,
                    createdAt: remote.createdAt
                ))
            }
        }

        for local in existing where !remoteIds.contains(local.id) {
            context.delete(local)
        }
    }

    private func fetchActiveWeeklyPlanId(goalId: String) -> String? {
        let activeStatus = WeeklyPlanStatus.active.rawValue
        let descriptor = FetchDescriptor<LocalWeeklyPlan>(
            predicate: #Predicate { $0.goalId == goalId && $0.status == activeStatus }
        )
        return (try? context.fetch(descriptor).first)?.id
    }

    private func taskProgressForPlan(_ planId: String) -> Double {
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.weeklyPlanId == planId }
        )
        guard let tasks = try? context.fetch(descriptor), !tasks.isEmpty else { return 0 }
        return progress(of: tasks)
    }

    private func progress(of tasks: [LocalWeeklyTask]) -> Double {
        let completed = tasks.filter(\.isCompleted).count
        return Double(completed) / Double(tasks.count)
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
    init(remote: RemoteMilestone) {
        self.init(
            id: remote.id,
            title: remote.title,
            description: remote.description,
            expectedOutcome: remote.expectedOutcome,
            targetMonth: remote.targetMonth,
            targetWeek: remote.targetWeek,
            isMonthlyCheckpoint: remote.isMonthlyCheckpoint,
            orderIndex: remote.orderIndex
        )
    }

    init(local: LocalMilestone) {
        self.init(
            id: local.id,
            title: local.title,
            description: local.milestoneDescription,
            expectedOutcome: local.expectedOutcome,
            targetMonth: local.targetMonth,
            targetWeek: local.targetWeek,
            isMonthlyCheckpoint: local.isMonthlyCheckpoint,
            orderIndex: local.orderIndex
        )
    }
}
