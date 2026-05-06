import Foundation

@MainActor
@Observable
final class AppViewModel {
    private(set) var hasSynced = false
    var profileComplete = false
    var goalComplete = false
    var roadmapReady = false
    var activeGoalId: String?
    var connectionError = false

    private(set) var localProfile: ProfileDTO?

    @ObservationIgnored private let profile: ProfileRepository
    @ObservationIgnored private let goals: GoalRepository
    @ObservationIgnored private let roadmap: RoadmapRepository

    init(
        profile: ProfileRepository,
        goals: GoalRepository,
        roadmap: RoadmapRepository
    ) {
        self.profile = profile
        self.goals = goals
        self.roadmap = roadmap
    }

    func resetForRetry() {
        hasSynced = false
    }

    func sync(userId: String) async {
        connectionError = false
        do {
            localProfile = try await profile.fetchProfile()
        } catch {
            connectionError = true
            return
        }

        guard localProfile?.isProfileComplete == true else {
            profileComplete = false
            goalComplete = false
            roadmapReady = false
            activeGoalId = nil
            hasSynced = true
            return
        }

        profileComplete = true

        let activeGoal: GoalDTO?
        do {
            activeGoal = try await goals.fetchActiveGoal(userId: userId)
        } catch {
            connectionError = true
            return
        }

        guard let activeGoal else {
            activeGoalId = nil
            goalComplete = false
            roadmapReady = false
            hasSynced = true
            return
        }

        applyGoalState(activeGoal)
        if activeGoal.status == .intakeCompleted {
            let status = try? await roadmap.fetchRoadmapStatus(goalId: activeGoal.id)
            if activeGoalId == activeGoal.id {
                roadmapReady = status == .complete
            }
        }

        hasSynced = true
    }

    func markRoadmapReady() {
        roadmapReady = true
    }

    private func applyGoalState(_ goal: GoalDTO) {
        activeGoalId = goal.id
        switch goal.status {
        case .active:
            goalComplete = true
            roadmapReady = true
        case .intakeCompleted:
            goalComplete = true
            roadmapReady = false
        case .intakeInProgress, .profileGenerating, .generationFailed:
            goalComplete = false
            roadmapReady = false
        }
    }
}
