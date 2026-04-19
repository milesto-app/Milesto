import SwiftData
import SwiftUI

extension HomeView {
    func applyRemoteToggle(_ updated: WeeklyTaskDTO) {
        if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
            tasks[idx] = updated
        }
        updateCachedTask(id: updated.id, isCompleted: updated.isCompleted)

        Task {
            do {
                let remote = try await RoadmapAPIService.shared.toggleTask(
                    taskId: updated.id,
                    isCompleted: updated.isCompleted
                )
                if let idx = tasks.firstIndex(where: { $0.id == remote.id }) {
                    tasks[idx] = remote
                }
                updateCachedTask(id: remote.id, isCompleted: remote.isCompleted)
            } catch {
                let reverted = !updated.isCompleted
                if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
                    let original = tasks[idx]
                    tasks[idx] = WeeklyTaskDTO(
                        id: original.id,
                        weeklyPlanId: original.weeklyPlanId,
                        goalId: original.goalId,
                        userId: original.userId,
                        title: original.title,
                        description: original.description,
                        difficultyRating: original.difficultyRating,
                        orderIndex: original.orderIndex,
                        isCompleted: reverted,
                        isFallback: original.isFallback,
                        createdAt: original.createdAt
                    )
                }
                updateCachedTask(id: updated.id, isCompleted: reverted)
            }
        }
    }

    func toggleTask(_ task: WeeklyTaskDTO) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        let newCompleted = !task.isCompleted
        let original = tasks[index]

        tasks[index] = WeeklyTaskDTO(
            id: original.id,
            weeklyPlanId: original.weeklyPlanId,
            goalId: original.goalId,
            userId: original.userId,
            title: original.title,
            description: original.description,
            difficultyRating: original.difficultyRating,
            orderIndex: original.orderIndex,
            isCompleted: newCompleted,
            isFallback: original.isFallback,
            createdAt: original.createdAt
        )

        updateCachedTask(id: task.id, isCompleted: newCompleted)

        Task {
            do {
                let updated = try await RoadmapAPIService.shared.toggleTask(
                    taskId: task.id,
                    isCompleted: newCompleted
                )
                if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
                    tasks[idx] = updated
                }
                updateCachedTask(id: updated.id, isCompleted: updated.isCompleted)
            } catch {
                if let idx = tasks.firstIndex(where: { $0.id == original.id }) {
                    tasks[idx] = original
                }
                updateCachedTask(id: original.id, isCompleted: original.isCompleted)
            }
        }
    }

    func updateCachedTask(id: String, isCompleted: Bool) {
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.id == id }
        )
        if let local = try? modelContext.fetch(descriptor).first {
            local.isCompleted = isCompleted
        }
    }

    func loadAllData() async {
        hasSyncError = false

        let cachedTasks = fetchCachedTasks()
        if !cachedTasks.isEmpty {
            tasks = cachedTasks
            isLoading = false
        }

        if weeklyPlan == nil {
            weeklyPlan = fetchCachedWeeklyPlan()
        }

        if let cached = fetchCachedDebrief() {
            todayDebrief = cached
        }

        var didSync = false

        async let fetchPlan: () = loadWeeklyPlan()
        async let fetchTasks: () = loadTasks()
        _ = await(fetchPlan, fetchTasks)
        didSync = !tasks.isEmpty || weeklyPlan != nil

        if let debriefs = try? await RoadmapAPIService.shared.getDebriefHistory(goalId: goalId) {
            let latestDebrief = debriefs.first
            todayDebrief = latestDebrief
            syncDebriefToCache(latestDebrief)
        }

        if !didSync, tasks.isEmpty, weeklyPlan == nil {
            hasSyncError = true
        }

        isLoading = false
    }

    func loadWeeklyPlan() async {
        if weeklyPlan == nil {
            weeklyPlan = fetchCachedWeeklyPlan()
        }

        if let existing = try? await RoadmapAPIService.shared.getWeeklyPlan(goalId: goalId) {
            weeklyPlan = existing
            upsertWeeklyPlanToCache(existing)
            return
        }
        if let generated = try? await RoadmapAPIService.shared.generateWeeklyPlan(goalId: goalId) {
            weeklyPlan = generated
            upsertWeeklyPlanToCache(generated)
        }
    }

    func fetchCachedWeeklyPlan() -> WeeklyPlanDTO? {
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

    func loadTasks() async {
        let cachedTasks = fetchCachedTasks()
        if !cachedTasks.isEmpty {
            tasks = cachedTasks
        }

        if let fetched = try? await RoadmapAPIService.shared.getWeeklyTasks(goalId: goalId) {
            tasks = fetched
            syncTasksToCache(fetched)
        }
    }

    func fetchCachedTasks() -> [WeeklyTaskDTO] {
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
        guard let dto else { return }

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
