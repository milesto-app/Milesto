import SwiftData
import SwiftUI

@Observable
final class RoadmapViewModel {
    var milestones: [DisplayMilestone] = []
    var isLoading = true
    var appeared = false

    var goalId: String = ""
    var modelContext: ModelContext?

    func configure(goalId: String, modelContext: ModelContext) {
        self.goalId = goalId
        self.modelContext = modelContext
    }

    func resetForGoalChange() {
        milestones = []
        isLoading = true
        appeared = false
    }

    func currentTaskProgress() -> Double {
        guard let modelContext else { return 0 }
        let goalId = goalId
        if let activePlan = fetchActiveWeeklyPlan() {
            return taskProgress(weeklyPlanId: activePlan.id)
        }

        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        guard let tasks = try? modelContext.fetch(descriptor), !tasks.isEmpty else { return 0 }
        return taskProgress(tasks)
    }

    func loadMilestones() async {
        let cached = fetchCachedMilestones()
        if !cached.isEmpty {
            milestones = cached
            isLoading = false
            if !appeared {
                appeared = true
            }
        }

        do {
            let roadmap = try await RoadmapAPIService.shared.getRoadmap(goalId: goalId)
            guard let dtos = roadmap.milestones else { return }

            syncRoadmapToCache(roadmap)
            await refreshCurrentTasksForProgress()

            let sorted = dtos.sorted { $0.orderIndex < $1.orderIndex }
            let currentMilestoneId = roadmap.currentMilestoneId
            var foundCurrent = false

            milestones = sorted.enumerated().map { index, dto in
                let status: MilestoneStatus
                if let currentId = currentMilestoneId {
                    if dto.id == currentId {
                        status = .current
                        foundCurrent = true
                    } else if !foundCurrent {
                        status = .completed
                    } else {
                        status = .upcoming
                    }
                } else {
                    status = index == 0 ? .current : .upcoming
                }

                return DisplayMilestone(
                    id: dto.id,
                    title: dto.title,
                    description: dto.description,
                    targetMonth: dto.targetMonth,
                    targetWeek: dto.targetWeek,
                    isMonthlyCheckpoint: dto.isMonthlyCheckpoint,
                    orderIndex: dto.orderIndex,
                    expectedOutcome: dto.expectedOutcome,
                    status: status,
                    progress: status == .current ? currentTaskProgress() : (status == .completed ? 1.0 : 0.0)
                )
            }
        } catch {}
        isLoading = false
    }

    func refreshDisplayedProgress() {
        let progress = currentTaskProgress()
        milestones = milestones.map { milestone in
            DisplayMilestone(
                id: milestone.id,
                title: milestone.title,
                description: milestone.description,
                targetMonth: milestone.targetMonth,
                targetWeek: milestone.targetWeek,
                isMonthlyCheckpoint: milestone.isMonthlyCheckpoint,
                orderIndex: milestone.orderIndex,
                expectedOutcome: milestone.expectedOutcome,
                status: milestone.status,
                progress: milestone.status == .current ? progress : milestone.progress
            )
        }
    }

    func refreshCurrentTasksForProgress() async {
        guard let fetched = try? await RoadmapAPIService.shared.getWeeklyTasks(goalId: goalId) else { return }
        syncTasksToCache(fetched)
    }
}
