import Foundation
import OSLog
import SwiftData

private let roadmapLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto", category: "Roadmap")

@MainActor
final class SyncingRoadmapRepository: RoadmapSummaryRepository, WeeklyTaskRepository, WeeklyPlanRepository, DebriefRepository {
    private let remote: any RoadmapRepository
    private let goals: any GoalRepository
    private let container: ModelContainer

    init(remote: any RoadmapRepository, goals: any GoalRepository, container: ModelContainer) {
        self.remote = remote
        self.goals = goals
        self.container = container
    }

    private var context: ModelContext {
        container.mainContext
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
            let dto = try await remote.getRoadmap(goalId: goalId)
            saveRoadmap(dto)
            try? context.save()
            await refreshTasksForProgress(goalId: goalId)

            snapshot.currentMilestoneId = dto.currentMilestoneId
            snapshot.milestones = (dto.milestones ?? [])
                .sorted { $0.orderIndex < $1.orderIndex }
                .map(MilestoneRecord.init(dto:))
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
            local.difficultyRating = task.difficultyRating?.rawValue
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
                difficultyRating: task.difficultyRating?.rawValue,
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
        let dto = try await remote.getRoadmap(goalId: goalId)
        saveRoadmap(dto)
        try? context.save()
        return dto.status
    }

    func isRoadmapReady(goalId: String) async -> Bool {
        (try? await fetchRoadmapStatus(goalId: goalId)) == .complete
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
                difficultyRating: local.difficultyRating.flatMap { DifficultyRating(rawValue: $0) },
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
            taskRatings: local.taskRatings,
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

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRating]?) async throws -> Debrief {
        let dto = try await remote.submitDebrief(
            goalId: goalId,
            weeklyPlanId: weeklyPlanId,
            note: note,
            taskRatings: taskRatings
        )
        saveDebrief(dto)
        try? context.save()
        return dto
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

    func currentMilestoneTitle(goalId: String) -> String? {
        let descriptor = FetchDescriptor<LocalRoadmap>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        guard let roadmap = try? context.fetch(descriptor).first,
              let currentId = roadmap.currentMilestoneId,
              let milestone = roadmap.milestones.first(where: { $0.id == currentId })
        else { return nil }
        return milestone.title
    }

    func goalTitle(goalId: String) -> String? {
        fetchGoalTitle(goalId: goalId)
    }

    func sortedTasks(_ tasks: [WeeklyTask]) -> [WeeklyTask] {
        tasks.sorted {
            if $0.isCompleted != $1.isCompleted { return !$0.isCompleted }
            let p0 = $0.difficultyRating.priority
            let p1 = $1.difficultyRating.priority
            if p0 != p1 { return p0 < p1 }
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

    private func saveWeeklyPlan(_ dto: WeeklyPlan) {
        let planId = dto.id
        let descriptor = FetchDescriptor<LocalWeeklyPlan>(
            predicate: #Predicate { $0.id == planId }
        )
        if let existing = try? context.fetch(descriptor).first {
            existing.milestoneId = dto.milestoneId
            existing.weekNumber = dto.weekNumber
            existing.weekStartDate = dto.weekStartDate
            existing.objectives = dto.objectives
            existing.status = dto.status.rawValue
            existing.isFallback = dto.isFallback
            existing.summaryCompletionRate = dto.summary?.completionRate
            existing.summaryTasksCompleted = dto.summary?.tasksCompleted
            existing.summaryTasksTotal = dto.summary?.tasksTotal
            existing.summaryDebriefCount = dto.summary?.debriefCount
            existing.summaryNarrative = dto.summary?.narrative
        } else {
            context.insert(LocalWeeklyPlan(
                id: dto.id,
                milestoneId: dto.milestoneId,
                goalId: dto.goalId,
                userId: dto.userId,
                weekNumber: dto.weekNumber,
                weekStartDate: dto.weekStartDate,
                objectives: dto.objectives,
                status: dto.status.rawValue,
                isFallback: dto.isFallback,
                createdAt: dto.createdAt,
                summary: dto.summary
            ))
        }
    }

    private func saveDebrief(_ dto: Debrief) {
        let debriefId = dto.id
        let descriptor = FetchDescriptor<LocalDebrief>(
            predicate: #Predicate { $0.id == debriefId }
        )
        let existing = try? context.fetch(descriptor).first

        if let existing {
            existing.update(with: dto)
        } else {
            context.insert(LocalDebrief(
                id: dto.id,
                goalId: dto.goalId,
                userId: dto.userId,
                weeklyPlanId: dto.weeklyPlanId,
                date: dto.date,
                note: dto.note,
                taskRatings: dto.taskRatings,
                createdAt: dto.createdAt
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

    private func saveRoadmap(_ dto: RoadmapDTO) {
        let goalId = dto.goalId
        let descriptor = FetchDescriptor<LocalRoadmap>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        if let existing = try? context.fetch(descriptor).first {
            existing.status = dto.status.rawValue
            existing.updatedAt = dto.updatedAt
            existing.currentMilestoneId = dto.currentMilestoneId

            if let dtos = dto.milestones {
                let existingById = Dictionary(uniqueKeysWithValues: existing.milestones.map { ($0.id, $0) })
                let remoteIds = Set(dtos.map(\.id))

                for milestoneDTO in dtos {
                    if let local = existingById[milestoneDTO.id] {
                        local.title = milestoneDTO.title
                        local.milestoneDescription = milestoneDTO.description
                        local.expectedOutcome = milestoneDTO.expectedOutcome
                        local.targetMonth = milestoneDTO.targetMonth
                        local.targetWeek = milestoneDTO.targetWeek
                        local.isMonthlyCheckpoint = milestoneDTO.isMonthlyCheckpoint
                        local.orderIndex = milestoneDTO.orderIndex
                    } else {
                        let local = LocalMilestone(
                            id: milestoneDTO.id,
                            goalId: milestoneDTO.goalId,
                            orderIndex: milestoneDTO.orderIndex,
                            title: milestoneDTO.title,
                            milestoneDescription: milestoneDTO.description,
                            expectedOutcome: milestoneDTO.expectedOutcome,
                            targetMonth: milestoneDTO.targetMonth,
                            targetWeek: milestoneDTO.targetWeek,
                            isMonthlyCheckpoint: milestoneDTO.isMonthlyCheckpoint,
                            createdAt: milestoneDTO.createdAt
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
            let localMilestones = (dto.milestones ?? []).map { milestoneDTO in
                LocalMilestone(
                    id: milestoneDTO.id,
                    goalId: milestoneDTO.goalId,
                    orderIndex: milestoneDTO.orderIndex,
                    title: milestoneDTO.title,
                    milestoneDescription: milestoneDTO.description,
                    expectedOutcome: milestoneDTO.expectedOutcome,
                    targetMonth: milestoneDTO.targetMonth,
                    targetWeek: milestoneDTO.targetWeek,
                    isMonthlyCheckpoint: milestoneDTO.isMonthlyCheckpoint,
                    createdAt: milestoneDTO.createdAt
                )
            }
            context.insert(LocalRoadmap(
                goalId: dto.goalId,
                userId: dto.userId,
                status: dto.status.rawValue,
                createdAt: dto.createdAt,
                updatedAt: dto.updatedAt,
                currentMilestoneId: dto.currentMilestoneId,
                milestones: localMilestones
            ))
        }
    }

    private func replaceWeeklyTasks(_ dtos: [WeeklyTask], goalId: String) {
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        let existing = (try? context.fetch(descriptor)) ?? []
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })
        let remoteIds = Set(dtos.map(\.id))

        for dto in dtos {
            if let local = existingById[dto.id] {
                local.weeklyPlanId = dto.weeklyPlanId
                local.title = dto.title
                local.taskDescription = dto.description
                local.difficultyRating = dto.difficultyRating?.rawValue
                local.orderIndex = dto.orderIndex
                local.isCompleted = dto.isCompleted
                local.isFallback = dto.isFallback
            } else {
                context.insert(LocalWeeklyTask(
                    id: dto.id,
                    weeklyPlanId: dto.weeklyPlanId,
                    goalId: dto.goalId,
                    userId: dto.userId,
                    title: dto.title,
                    taskDescription: dto.description,
                    difficultyRating: dto.difficultyRating?.rawValue,
                    orderIndex: dto.orderIndex,
                    isCompleted: dto.isCompleted,
                    isFallback: dto.isFallback,
                    createdAt: dto.createdAt
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
        let completedTasks = tasks.filter(\.isCompleted)
        let allComplete = !tasks.isEmpty && tasks.allSatisfy(\.isCompleted)
        let debriefMissingForCurrentPlan = latest?.weeklyPlanId != plan?.id
        return DebriefPromptState(
            weeklyPlanId: plan?.id,
            completedTasks: completedTasks,
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
            difficultyRating: difficultyRating,
            orderIndex: orderIndex,
            isCompleted: isCompleted,
            isFallback: isFallback,
            createdAt: createdAt
        )
    }
}

extension MilestoneRecord {
    init(dto: MilestoneDTO) {
        self.init(
            id: dto.id,
            title: dto.title,
            description: dto.description,
            expectedOutcome: dto.expectedOutcome,
            targetMonth: dto.targetMonth,
            targetWeek: dto.targetWeek,
            isMonthlyCheckpoint: dto.isMonthlyCheckpoint,
            orderIndex: dto.orderIndex
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
