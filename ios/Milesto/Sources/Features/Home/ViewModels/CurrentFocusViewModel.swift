import Foundation

@MainActor
@Observable
final class CurrentFocusViewModel {
    @ObservationIgnored private let repository: any RoadmapFeatureRepository
    @ObservationIgnored private var goalId: String = ""

    private(set) var title: String = ""
    private(set) var progress: Double = 0
    private(set) var hasError = false

    init(repository: any RoadmapFeatureRepository) {
        self.repository = repository
    }

    func configure(goalId: String) {
        self.goalId = goalId
        applyLocalSnapshot()
    }

    func refresh() async {
        let snapshot = await repository.refreshRoadmap(goalId: goalId)
        if let milestoneId = snapshot.currentMilestoneId,
           let milestone = snapshot.milestones.first(where: { $0.id == milestoneId })
        {
            title = milestone.title
        } else if let goalTitle = snapshot.goalTitle {
            title = goalTitle
        }
        progress = repository.currentTaskProgress(goalId: goalId)
        hasError = title.isEmpty
    }

    func reactToTaskChange() {
        progress = repository.currentTaskProgress(goalId: goalId)
    }

    private func applyLocalSnapshot() {
        let snapshot = repository.loadRoadmapSnapshot(goalId: goalId)
        if let milestoneId = snapshot.currentMilestoneId,
           let milestone = snapshot.milestones.first(where: { $0.id == milestoneId })
        {
            title = milestone.title
        } else if let goalTitle = snapshot.goalTitle {
            title = goalTitle
        }
        progress = repository.currentTaskProgress(goalId: goalId)
    }
}
