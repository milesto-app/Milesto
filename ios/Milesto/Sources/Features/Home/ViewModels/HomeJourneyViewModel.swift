import Foundation

@MainActor
@Observable
final class HomeJourneyViewModel {
    @ObservationIgnored private let repository: RoadmapRepository
    @ObservationIgnored private var goalId: String = ""

    private(set) var goalTitle: String = ""
    private(set) var goalDeadlineText: String?
    private(set) var completionProgress: Double = 0

    init(repository: RoadmapRepository) {
        self.repository = repository
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func refresh() async {
        guard !goalId.isEmpty else { return }
        guard let snapshot = try? await repository.fetchRoadmap(goalId: goalId, userId: nil) else { return }
        let tasks = (try? await repository.fetchWeeklyTasks(goalId: goalId)) ?? []
        applySnapshot(snapshot, tasks: tasks)
    }

    private func applySnapshot(_ snapshot: RoadmapSnapshot, tasks: [WeeklyTask]) {
        if let goalTitle = snapshot.goalTitle {
            self.goalTitle = goalTitle
        }
        goalDeadlineText = snapshot.goalTargetDate.map(Self.formattedDeadline)
        completionProgress = Self.completionProgress(snapshot: snapshot, tasks: tasks)
    }

    private static func completionProgress(snapshot: RoadmapSnapshot, tasks: [WeeklyTask]) -> Double {
        let records = snapshot.milestones
        guard !records.isEmpty else { return 0 }

        let currentIndex = snapshot.currentMilestoneId.flatMap { currentMilestoneId in
            records.firstIndex { $0.id == currentMilestoneId }
        } ?? 0

        let currentTaskProgress: Double
        if tasks.isEmpty {
            currentTaskProgress = 0
        } else {
            let completed = tasks.filter(\.isCompleted).count
            currentTaskProgress = Double(completed) / Double(tasks.count)
        }

        return (Double(currentIndex) + currentTaskProgress) / Double(records.count)
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
