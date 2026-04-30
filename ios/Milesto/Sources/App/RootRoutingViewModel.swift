import Foundation

@MainActor
@Observable
final class RootRoutingViewModel {
    private(set) var hasSynced = false
    var profileComplete = false
    var goalComplete = false
    var roadmapReady = false
    var activeGoalId: String?
    var connectionError = false

    private(set) var localProfile: Profile?
    private(set) var localGoals: [Goal] = []

    @ObservationIgnored private let profile: any ProfileRepository
    @ObservationIgnored private let goals: any GoalRoutingRepository
    @ObservationIgnored private let roadmap: any RoadmapRepository

    init(
        profile: any ProfileRepository,
        goals: any GoalRoutingRepository,
        roadmap: any RoadmapRepository
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
        refreshLocalSnapshots(userId: userId)

        let locallyComplete = localProfile?.isProfileComplete == true
        if locallyComplete {
            profileComplete = true
            applyResolvedGoalState(userId: userId)
        }

        do {
            try await profile.sync(userId: userId)
        } catch {
            connectionError = true
            return
        }

        do {
            try await goals.syncFromRemote(userId: userId)
        } catch {
            connectionError = true
            return
        }

        refreshLocalSnapshots(userId: userId)

        let remoteComplete = localProfile?.isProfileComplete == true
        if locallyComplete, !remoteComplete {
            profileComplete = false
            goalComplete = false
            roadmapReady = false
            activeGoalId = nil
        } else if remoteComplete {
            profileComplete = true
            applyResolvedGoalState(userId: userId)
            if goalComplete,
               let id = activeGoalId,
               let descriptor = goals.resolveActiveGoal(userId: userId),
               descriptor.goalId == id,
               descriptor.phase == .intakeCompleted
            {
                let hasRoadmap = await roadmap.isRoadmapReady(goalId: id)
                if activeGoalId == id {
                    roadmapReady = hasRoadmap
                }
            }
        }
        hasSynced = true
    }

    func handleGoalChanged(_ newGoalId: String) {
        guard newGoalId != activeGoalId else { return }
        activeGoalId = newGoalId

        let goal = localGoals.first(where: { $0.id == newGoalId })
        guard let status = goal?.status else { return }

        switch status {
        case "active":
            goalComplete = true
            roadmapReady = true
        case ProfileStatus.intakeCompleted.rawValue:
            goalComplete = true
            roadmapReady = false
            Task { [weak self] in
                guard let self else { return }
                let hasRoadmap = await roadmap.isRoadmapReady(goalId: newGoalId)
                guard self.activeGoalId == newGoalId else { return }
                self.roadmapReady = hasRoadmap
            }
        default:
            goalComplete = false
            roadmapReady = false
        }
    }

    func markRoadmapReady() {
        roadmapReady = true
        guard let activeGoalId else { return }
        try? goals.markActive(goalId: activeGoalId)
    }

    private func refreshLocalSnapshots(userId: String) {
        localProfile = profile.loadCachedProfile(userId: userId)
        localGoals = goals.localGoals(userId: userId)
    }

    private func applyResolvedGoalState(userId: String) {
        guard let descriptor = goals.resolveActiveGoal(userId: userId) else {
            activeGoalId = nil
            goalComplete = false
            roadmapReady = false
            return
        }
        activeGoalId = descriptor.goalId
        switch descriptor.phase {
        case .active:
            goalComplete = true
            roadmapReady = true
        case .intakeCompleted:
            goalComplete = true
            roadmapReady = false
        case .intakeInProgress, .profileGenerating, .generationFailed, .other:
            goalComplete = false
            roadmapReady = false
        }
    }
}
