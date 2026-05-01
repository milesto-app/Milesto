import Foundation

@MainActor
@Observable
final class HomeJourneyViewModel {
    @ObservationIgnored private let repository: any RoadmapFeatureRepository
    @ObservationIgnored private var goalId: String = ""

    private(set) var goalTitle: String = ""
    private(set) var goalDeadlineText: String?
    private(set) var completionProgress: Double = 0

    init(repository: any RoadmapFeatureRepository) {
        self.repository = repository
    }

    func configure(goalId: String) {
        self.goalId = goalId
        applySnapshot(repository.loadRoadmapSnapshot(goalId: goalId))
    }

    func refresh() async {
        applySnapshot(await repository.refreshRoadmap(goalId: goalId))
    }

    func reactToTaskChange() {
        applySnapshot(repository.loadRoadmapSnapshot(goalId: goalId))
    }

    private func applySnapshot(_ snapshot: RoadmapSnapshot) {
        if let goalTitle = snapshot.goalTitle {
            self.goalTitle = goalTitle
        }
        goalDeadlineText = snapshot.goalTargetDate.map(Self.formattedDeadline)
        completionProgress = Self.completionProgress(
            snapshot: snapshot,
            currentTaskProgress: repository.currentTaskProgress(goalId: goalId)
        )
    }

    private static func completionProgress(snapshot: RoadmapSnapshot, currentTaskProgress: Double) -> Double {
        let records = snapshot.milestones
        guard !records.isEmpty else { return 0 }

        let currentIndex = snapshot.currentMilestoneId.flatMap { currentMilestoneId in
            records.firstIndex { $0.id == currentMilestoneId }
        } ?? 0

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
