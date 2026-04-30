import Foundation
import OSLog
import SwiftData

private let roadmapLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto-ai", category: "Roadmap")

@MainActor
final class SyncingRoadmapFeatureRepository: RoadmapFeatureRepository {
    private let remote: any RoadmapRepository
    private let container: ModelContainer

    init(remote: any RoadmapRepository, container: ModelContainer) {
        self.remote = remote
        self.container = container
    }

    private var context: ModelContext {
        container.mainContext
    }

    func loadCachedRoadmap(goalId: String) -> CachedRoadmap {
        CachedRoadmap(
            goalTitle: fetchGoalTitle(goalId: goalId),
            switchableGoals: fetchSwitchableGoals(),
            currentMilestoneId: fetchCachedRoadmap(goalId: goalId)?.currentMilestoneId,
            milestones: fetchCachedMilestoneRecords(goalId: goalId)
        )
    }

    func refreshRoadmap(goalId: String) async -> CachedRoadmap {
        var snapshot = loadCachedRoadmap(goalId: goalId)
        do {
            let dto = try await remote.getRoadmap(goalId: goalId)
            syncRoadmapToCache(dto)
            try? context.save()
            await refreshTasksForProgress(goalId: goalId)

            snapshot.currentMilestoneId = dto.currentMilestoneId
            snapshot.milestones = (dto.milestones ?? [])
                .sorted { $0.orderIndex < $1.orderIndex }
                .map(MilestoneRecord.init(dto:))
            snapshot.goalTitle = fetchGoalTitle(goalId: goalId)
            snapshot.switchableGoals = fetchSwitchableGoals()
        } catch {
            roadmapLogger.error("refreshRoadmap remote fetch failed; serving cached snapshot: \(String(describing: error), privacy: .public)")
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
        cacheTask(updated)
        return updated
    }

    func cacheTask(_ task: WeeklyTask) {
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
        syncRoadmapToCache(dto)
        try? context.save()
        return dto.status
    }

    private func refreshTasksForProgress(goalId: String) async {
        guard let fetched = try? await remote.getWeeklyTasks(goalId: goalId) else { return }
        syncTasksToCache(fetched, goalId: goalId)
        try? context.save()
    }

    private func fetchGoalTitle(goalId: String) -> String? {
        let descriptor = FetchDescriptor<Goal>(
            predicate: #Predicate { $0.id == goalId }
        )
        return try? context.fetch(descriptor).first?.title
    }

    private func fetchSwitchableGoals() -> [GoalSummary] {
        let descriptor = FetchDescriptor<Goal>()
        guard let goals = try? context.fetch(descriptor) else { return [] }
        let intakeStatus = ProfileStatus.intakeCompleted.rawValue
        return goals
            .filter { $0.status == "active" || $0.status == intakeStatus }
            .map { GoalSummary(id: $0.id, title: $0.title, status: $0.status) }
    }

    private func fetchCachedRoadmap(goalId: String) -> LocalRoadmap? {
        let descriptor = FetchDescriptor<LocalRoadmap>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        return try? context.fetch(descriptor).first
    }

    private func fetchCachedMilestoneRecords(goalId: String) -> [MilestoneRecord] {
        guard let roadmap = fetchCachedRoadmap(goalId: goalId), !roadmap.milestones.isEmpty else { return [] }
        return roadmap.milestones
            .sorted { $0.orderIndex < $1.orderIndex }
            .map { MilestoneRecord(local: $0) }
    }

    private func syncRoadmapToCache(_ dto: RoadmapDTO) {
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

    private func syncTasksToCache(_ dtos: [WeeklyTask], goalId: String) {
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
