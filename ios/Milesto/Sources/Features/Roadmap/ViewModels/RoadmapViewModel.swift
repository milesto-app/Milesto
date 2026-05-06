import Foundation

@MainActor
@Observable
final class RoadmapViewModel {
    @ObservationIgnored private let roadmap: RoadmapRepository
    @ObservationIgnored private let goals: GoalRepository

    private(set) var goalId: String = ""
    private(set) var goalTitle: String = ""
    private(set) var milestones: [DisplayMilestone] = []
    private(set) var isLoading = true
    var appeared = false

    init(roadmap: RoadmapRepository, goals: GoalRepository) {
        self.roadmap = roadmap
        self.goals = goals
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func resetForGoalChange() {
        milestones = []
        goalTitle = ""
        isLoading = true
        appeared = false
    }

    func loadMilestones() async {
        guard !goalId.isEmpty else { return }

        let goal = try? await goals.fetchGoal(goalId: goalId)
        let dto = try? await roadmap.fetchRoadmap(goalId: goalId)
        let tasks = (try? await roadmap.fetchWeeklyTasks(goalId: goalId)) ?? []

        if let title = goal?.title {
            goalTitle = title
        }
        milestones = Self.buildMilestones(from: dto, tasks: tasks)

        isLoading = false
        if !appeared {
            appeared = true
        }
    }

    private static func buildMilestones(from roadmap: RoadmapDTO?, tasks: [WeeklyTask]) -> [DisplayMilestone] {
        let records = (roadmap?.milestones ?? []).sorted { $0.orderIndex < $1.orderIndex }
        guard !records.isEmpty else { return [] }

        let progress: Double
        if tasks.isEmpty {
            progress = 0
        } else {
            let completed = tasks.filter(\.isCompleted).count
            progress = Double(completed) / Double(tasks.count)
        }

        var foundCurrent = false
        let currentMilestoneId = roadmap?.currentMilestoneId

        return records.enumerated().map { index, record in
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
