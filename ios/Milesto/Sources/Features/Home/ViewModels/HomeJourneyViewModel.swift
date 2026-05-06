import Foundation

@MainActor
@Observable
final class HomeJourneyViewModel {
    @ObservationIgnored private let roadmap: RoadmapRepository
    @ObservationIgnored private let goals: GoalRepository
    @ObservationIgnored private var goalId: String = ""

    private(set) var goalTitle: String = ""
    private(set) var goalDeadlineText: String?
    private(set) var completionProgress: Double = 0

    init(roadmap: RoadmapRepository, goals: GoalRepository) {
        self.roadmap = roadmap
        self.goals = goals
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func refresh() async {
        guard !goalId.isEmpty else { return }
        let goal = try? await goals.fetchGoal(goalId: goalId)
        let roadmapDTO = try? await roadmap.fetchRoadmap(goalId: goalId)
        let tasks = (try? await roadmap.fetchWeeklyTasks(goalId: goalId)) ?? []

        if let title = goal?.title {
            goalTitle = title
        }
        goalDeadlineText = goal?.targetDate.map(Self.formattedDeadline)
        completionProgress = Self.completionProgress(roadmap: roadmapDTO, tasks: tasks)
    }

    private static func completionProgress(roadmap: RoadmapDTO?, tasks: [WeeklyTask]) -> Double {
        let milestones = (roadmap?.milestones ?? []).sorted { $0.orderIndex < $1.orderIndex }
        guard !milestones.isEmpty else { return 0 }

        let currentIndex = roadmap?.currentMilestoneId.flatMap { id in
            milestones.firstIndex { $0.id == id }
        } ?? 0

        let currentTaskProgress: Double
        if tasks.isEmpty {
            currentTaskProgress = 0
        } else {
            let completed = tasks.filter(\.isCompleted).count
            currentTaskProgress = Double(completed) / Double(tasks.count)
        }

        return (Double(currentIndex) + currentTaskProgress) / Double(milestones.count)
    }

    private static func formattedDeadline(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return String(
            format: String(localized: "home.journey.deadline", table: "Home"),
            formatter.string(from: date)
        )
    }
}
