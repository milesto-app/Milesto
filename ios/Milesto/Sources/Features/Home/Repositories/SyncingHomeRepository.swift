import Foundation
import SwiftData

@MainActor
final class SyncingHomeRepository: HomeRepository {
    private let remote: any RoadmapRepository
    private let container: ModelContainer

    init(remote: any RoadmapRepository, container: ModelContainer) {
        self.remote = remote
        self.container = container
    }

    private var context: ModelContext {
        container.mainContext
    }

    func loadCachedSnapshot(goalId: String) -> HomeSnapshot {
        HomeSnapshot(
            goalTitle: fetchGoalTitle(goalId: goalId),
            currentMilestoneTitle: fetchCurrentMilestoneTitle(goalId: goalId),
            weeklyPlan: fetchCachedWeeklyPlan(goalId: goalId),
            tasks: fetchCachedTasks(goalId: goalId),
            todayDebrief: fetchCachedDebrief(goalId: goalId),
            hasSyncError: false
        )
    }

    func refreshAll(goalId: String) async -> HomeSnapshot {
        var snapshot = loadCachedSnapshot(goalId: goalId)

        async let plan: WeeklyPlan? = loadOrGenerateWeeklyPlan(goalId: goalId)
        async let tasks: [WeeklyTask]? = try? remote.getWeeklyTasks(goalId: goalId)
        async let debriefs: [Debrief]? = try? remote.getDebriefHistory(goalId: goalId)

        let (fetchedPlan, fetchedTasks, fetchedDebriefs) = await(plan, tasks, debriefs)

        var didSync = false

        if let fetchedPlan {
            snapshot.weeklyPlan = fetchedPlan
            upsertWeeklyPlanToCache(fetchedPlan)
            didSync = true
        }

        if let fetchedTasks {
            snapshot.tasks = fetchedTasks
            syncTasksToCache(fetchedTasks, goalId: goalId)
            didSync = true
        }

        if let latestDebrief = fetchedDebriefs?.first {
            snapshot.todayDebrief = latestDebrief
            syncDebriefToCache(latestDebrief)
        }

        snapshot.hasSyncError = !didSync && snapshot.tasks.isEmpty && snapshot.weeklyPlan == nil
        snapshot.goalTitle = fetchGoalTitle(goalId: goalId)
        snapshot.currentMilestoneTitle = fetchCurrentMilestoneTitle(goalId: goalId)
        try? context.save()
        return snapshot
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

    func generateWeeklyPlan(goalId: String) async throws {
        _ = try await remote.generateWeeklyPlan(goalId: goalId)
    }

    func waitForGeneratedTasks(goalId: String) async -> Bool {
        for _ in 0 ..< 30 {
            try? await Task.sleep(for: .seconds(2))
            if let tasks = try? await remote.getWeeklyTasks(goalId: goalId), !tasks.isEmpty {
                syncTasksToCache(tasks, goalId: goalId)
                try? context.save()
                return true
            }
        }
        return false
    }

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRating]?) async throws -> Debrief {
        let dto = try await remote.submitDebrief(
            goalId: goalId,
            weeklyPlanId: weeklyPlanId,
            note: note,
            taskRatings: taskRatings
        )
        syncDebriefToCache(dto)
        try? context.save()
        return dto
    }

    private func loadOrGenerateWeeklyPlan(goalId: String) async -> WeeklyPlan? {
        if let existing = try? await remote.getWeeklyPlan(goalId: goalId) {
            return existing
        }
        return try? await remote.generateWeeklyPlan(goalId: goalId)
    }

    private func fetchGoalTitle(goalId: String) -> String? {
        let descriptor = FetchDescriptor<Goal>(
            predicate: #Predicate { $0.id == goalId }
        )
        return try? context.fetch(descriptor).first?.title
    }

    private func fetchCurrentMilestoneTitle(goalId: String) -> String? {
        let descriptor = FetchDescriptor<LocalRoadmap>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        guard let roadmap = try? context.fetch(descriptor).first,
              let currentId = roadmap.currentMilestoneId,
              let milestone = roadmap.milestones.first(where: { $0.id == currentId })
        else { return nil }
        return milestone.title
    }

    private func fetchCachedWeeklyPlan(goalId: String) -> WeeklyPlan? {
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

    private func upsertWeeklyPlanToCache(_ dto: WeeklyPlan) {
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

    private func fetchCachedTasks(goalId: String) -> [WeeklyTask] {
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.orderIndex)]
        )
        guard let cached = try? context.fetch(descriptor), !cached.isEmpty else { return [] }
        return cached.map { local in
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

    private func fetchCachedDebrief(goalId: String) -> Debrief? {
        let descriptor = FetchDescriptor<LocalDebrief>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        guard let local = try? context.fetch(descriptor).first else { return nil }
        let taskRatings: [TaskRating] = local.taskRatingsJSON
            .flatMap { try? JSONDecoder().decode([TaskRating].self, from: $0) } ?? []
        return Debrief(
            id: local.id,
            goalId: local.goalId,
            userId: local.userId,
            weeklyPlanId: local.weeklyPlanId,
            date: local.date,
            note: local.note,
            taskRatings: taskRatings,
            createdAt: local.createdAt
        )
    }

    private func syncDebriefToCache(_ dto: Debrief) {
        let debriefId = dto.id
        let descriptor = FetchDescriptor<LocalDebrief>(
            predicate: #Predicate { $0.id == debriefId }
        )
        let existing = try? context.fetch(descriptor).first
        let ratingsData = try? JSONEncoder().encode(dto.taskRatings)

        if let existing {
            existing.note = dto.note
            existing.weeklyPlanId = dto.weeklyPlanId
            existing.taskRatingsJSON = ratingsData
        } else {
            context.insert(LocalDebrief(
                id: dto.id,
                goalId: dto.goalId,
                userId: dto.userId,
                weeklyPlanId: dto.weeklyPlanId,
                date: dto.date,
                note: dto.note,
                taskRatingsJSON: ratingsData,
                createdAt: dto.createdAt
            ))
        }
    }
}
