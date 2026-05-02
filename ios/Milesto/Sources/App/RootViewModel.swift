import Foundation

@MainActor
@Observable
final class RootViewModel {
    private(set) var hasSynced = false
    var profileComplete = false
    var goalComplete = false
    var roadmapReady = false
    var activeGoalId: String?
    var connectionError = false

    private(set) var localProfile: ProfileSnapshot?

    @ObservationIgnored private let profile: any ProfileRepository
    @ObservationIgnored private let goals: any GoalRoutingRepository
    @ObservationIgnored private let roadmap: any RoadmapSummaryRepository

    init(
        profile: any ProfileRepository,
        goals: any GoalRoutingRepository,
        roadmap: any RoadmapSummaryRepository
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
               let descriptor = goals.resolveGoal(userId: userId, goalId: id),
               descriptor.goalId == id,
               descriptor.phase == .intakeCompleted
            {
                let status = try? await roadmap.fetchRoadmapStatus(goalId: id)
                if activeGoalId == id {
                    roadmapReady = status == .complete
                }
            }
        }
        hasSynced = true
    }

    func markRoadmapReady() {
        roadmapReady = true
        guard let activeGoalId else { return }
        try? goals.activateGeneratedRoadmap(goalId: activeGoalId)
    }

    private func refreshLocalSnapshots(userId: String) {
        localProfile = profile.loadProfile(userId: userId)
    }

    private func applyResolvedGoalState(userId: String) {
        guard let descriptor = goals.resolveActiveGoal(userId: userId) else {
            activeGoalId = nil
            goalComplete = false
            roadmapReady = false
            return
        }
        applyGoalState(descriptor)
    }

    private func applyGoalState(_ descriptor: ActiveGoalDescriptor) {
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
