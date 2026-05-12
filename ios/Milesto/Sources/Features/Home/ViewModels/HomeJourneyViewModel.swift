import Foundation

@MainActor
@Observable
final class HomeJourneyViewModel {
    @ObservationIgnored private let env: AppEnv
    @ObservationIgnored private var goalId: String = ""

    private(set) var goalTitle: String = ""
    private(set) var goalDeadlineText: String?
    private(set) var completionProgress: Double = 0

    init(env: AppEnv) {
        self.env = env
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func refresh() async {
        guard !goalId.isEmpty else { return }
        let goal = try? await env.goals.fetchGoal(goalId: goalId)
        let roadmapDTO = try? await env.roadmap.fetchRoadmap(goalId: goalId)
        let tasks = (try? await env.roadmap.fetchWeeklyTasks(goalId: goalId)) ?? []

        if let title = goal?.title {
            goalTitle = title
        }
        goalDeadlineText = goal?.targetDate.map(Self.formattedDeadline)
        completionProgress = Self.completionProgress(roadmap: roadmapDTO, tasks: tasks)
    }

    private static func completionProgress(roadmap: RoadmapDTO?, tasks: [WeeklyTaskDTO]) -> Double {
        let milestones = (roadmap?.milestones ?? []).sorted { $0.orderIndex < $1.orderIndex }
        guard !milestones.isEmpty else { return 0 }

        let completedCount = milestones.filter { $0.completedAt != nil }.count

        let currentTaskProgress: Double
        if let currentId = roadmap?.currentMilestoneId,
           milestones.contains(where: { $0.id == currentId }),
           !tasks.isEmpty
        {
            let completed = tasks.filter(\.isCompleted).count
            currentTaskProgress = Double(completed) / Double(tasks.count)
        } else {
            currentTaskProgress = 0
        }

        return (Double(completedCount) + currentTaskProgress) / Double(milestones.count)
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
