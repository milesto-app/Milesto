import Foundation

@MainActor
@Observable
final class RoadmapViewModel {
    @ObservationIgnored private let repository: RoadmapRepository

    private(set) var goalId: String = ""
    private(set) var goalTitle: String = ""
    private(set) var switchableGoals: [GoalSummary] = []
    private(set) var milestones: [DisplayMilestone] = []
    private(set) var isLoading = true
    var appeared = false

    init(repository: RoadmapRepository) {
        self.repository = repository
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func resetForGoalChange() {
        milestones = []
        goalTitle = ""
        switchableGoals = []
        isLoading = true
        appeared = false
    }

    func loadMilestones(userId: String?) async {
        guard !goalId.isEmpty else { return }
        guard let snapshot = try? await repository.fetchRoadmap(goalId: goalId, userId: userId) else {
            isLoading = false
            return
        }
        let tasks = (try? await repository.fetchWeeklyTasks(goalId: goalId)) ?? []
        applySnapshot(snapshot, tasks: tasks)
        isLoading = false
        if !appeared {
            appeared = true
        }
    }

    private func applySnapshot(_ snapshot: RoadmapSnapshot, tasks: [WeeklyTask]) {
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
        let progress: Double
        if tasks.isEmpty {
            progress = 0
        } else {
            let completed = tasks.filter(\.isCompleted).count
            progress = Double(completed) / Double(tasks.count)
        }

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
                orderIndex: record.orderIndex,
                expectedOutcome: record.expectedOutcome,
                status: status,
                progress: status == .current ? progress : (status == .completed ? 1.0 : 0.0)
            )
        }
    }
}
