import Foundation
import SwiftData

extension HomeViewModel {
    func fetchCachedWeeklyPlan() -> WeeklyPlanDTO? {
        guard let modelContext else { return nil }
        let goalId = goalId
        let activeStatus = WeeklyPlanStatus.active.rawValue
        let descriptor = FetchDescriptor<LocalWeeklyPlan>(
            predicate: #Predicate { $0.goalId == goalId && $0.status == activeStatus }
        )
        guard let local = try? modelContext.fetch(descriptor).first else { return nil }
        return WeeklyPlanDTO(
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

    func upsertWeeklyPlanToCache(_ dto: WeeklyPlanDTO) {
        guard let modelContext else { return }
        let planId = dto.id
        let descriptor = FetchDescriptor<LocalWeeklyPlan>(
            predicate: #Predicate { $0.id == planId }
        )

        if let existing = try? modelContext.fetch(descriptor).first {
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
            let local = LocalWeeklyPlan(
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
            )
            modelContext.insert(local)
        }
    }

    func fetchCachedTasks() -> [WeeklyTaskDTO] {
        guard let modelContext else { return [] }
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.orderIndex)]
        )
        guard let cached = try? modelContext.fetch(descriptor), !cached.isEmpty else { return [] }
        return cached.map { local in
            WeeklyTaskDTO(
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

    func fetchCachedDebrief() -> DebriefDTO? {
        guard let modelContext else { return nil }
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalDebrief>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.date, order: .reverse)]
        )
        guard let local = try? modelContext.fetch(descriptor).first else { return nil }
        let taskRatings: [TaskRatingDTO] = local.taskRatingsJSON
            .flatMap { try? JSONDecoder().decode([TaskRatingDTO].self, from: $0) } ?? []
        return DebriefDTO(
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

    func syncDebriefToCache(_ dto: DebriefDTO?) {
        guard let modelContext, let dto else { return }

        let debriefId = dto.id
        let descriptor = FetchDescriptor<LocalDebrief>(
            predicate: #Predicate { $0.id == debriefId }
        )
        let existing = try? modelContext.fetch(descriptor).first

        let ratingsData = try? JSONEncoder().encode(dto.taskRatings)

        if let existing {
            existing.note = dto.note
            existing.weeklyPlanId = dto.weeklyPlanId
            existing.taskRatingsJSON = ratingsData
        } else {
            let local = LocalDebrief(
                id: dto.id,
                goalId: dto.goalId,
                userId: dto.userId,
                weeklyPlanId: dto.weeklyPlanId,
                date: dto.date,
                note: dto.note,
                taskRatingsJSON: ratingsData,
                createdAt: dto.createdAt
            )
            modelContext.insert(local)
        }
    }

    func syncTasksToCache(_ dtos: [WeeklyTaskDTO]) {
        guard let modelContext else { return }
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        let existing = (try? modelContext.fetch(descriptor)) ?? []
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
                let local = LocalWeeklyTask(
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
                )
                modelContext.insert(local)
            }
        }

        for local in existing where !remoteIds.contains(local.id) {
            modelContext.delete(local)
        }
    }
}
