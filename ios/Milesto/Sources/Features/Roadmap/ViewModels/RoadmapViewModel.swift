import Foundation

@MainActor
@Observable
final class RoadmapViewModel {
    @ObservationIgnored private let repository: any RoadmapFeatureRepository

    private(set) var goalId: String = ""
    private(set) var goalTitle: String = ""
    private(set) var switchableGoals: [GoalSummary] = []
    private(set) var milestones: [DisplayMilestone] = []
    private(set) var isLoading = true
    var appeared = false

    init(repository: any RoadmapFeatureRepository) {
        self.repository = repository
    }

    var completionProgress: Double {
        guard !milestones.isEmpty else { return 0 }
        let completed = Double(milestones.filter { $0.status == .completed }.count)
        let currentProgress = milestones.contains(where: { $0.status == .current })
            ? repository.currentTaskProgress(goalId: goalId)
            : 0
        return (completed + currentProgress) / Double(milestones.count)
    }

    func configure(goalId: String) {
        self.goalId = goalId
        applySnapshot(repository.loadCachedRoadmap(goalId: goalId))
    }

    func resetForGoalChange() {
        milestones = []
        goalTitle = ""
        switchableGoals = []
        isLoading = true
        appeared = false
    }

    func loadMilestones() async {
        let snapshot = await repository.refreshRoadmap(goalId: goalId)
        applySnapshot(snapshot)
        isLoading = false
        if !appeared {
            appeared = true
        }
    }

    func refreshDisplayedProgress() {
        let progress = repository.currentTaskProgress(goalId: goalId)
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

    private func applySnapshot(_ snapshot: CachedRoadmap) {
        if let goalTitle = snapshot.goalTitle {
            self.goalTitle = goalTitle
        }
        switchableGoals = snapshot.switchableGoals

        let records = snapshot.milestones
        guard !records.isEmpty else {
            milestones = []
            return
        }

        var foundCurrent = false
        let currentMilestoneId = snapshot.currentMilestoneId
        let progress = repository.currentTaskProgress(goalId: goalId)

        milestones = records.enumerated().map { index, record in
            let status: MilestoneStatus
            if let currentMilestoneId {
                if record.id == currentMilestoneId {
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
                id: record.id,
                title: record.title,
                description: record.description,
                targetMonth: record.targetMonth,
                targetWeek: record.targetWeek,
                isMonthlyCheckpoint: record.isMonthlyCheckpoint,
                orderIndex: record.orderIndex,
                expectedOutcome: record.expectedOutcome,
                status: status,
                progress: status == .current ? progress : (status == .completed ? 1.0 : 0.0)
            )
        }

        if !milestones.isEmpty {
            isLoading = false
            if !appeared {
                appeared = true
            }
        }
    }
}
