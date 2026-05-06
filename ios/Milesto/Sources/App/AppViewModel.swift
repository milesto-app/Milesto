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

    private(set) var localProfile: ProfileSnapshot?

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

        let remoteComplete = localProfile?.isProfileComplete == true
        if !remoteComplete {
            profileComplete = false
            goalComplete = false
            roadmapReady = false
            activeGoalId = nil
            hasSynced = true
            return
        }

        profileComplete = true

        let descriptor: ActiveGoalDescriptor?
        do {
            descriptor = try await goals.resolveActiveGoal(userId: userId)
        } catch {
            connectionError = true
            return
        }

        if let descriptor {
            applyGoalState(descriptor)
            if descriptor.phase == .intakeCompleted {
                let status = try? await roadmap.fetchRoadmapStatus(goalId: descriptor.goalId)
                if activeGoalId == descriptor.goalId {
                    roadmapReady = status == .complete
                }
            }
        } else {
            activeGoalId = nil
            goalComplete = false
            roadmapReady = false
        }

        hasSynced = true
    }

    func markRoadmapReady() {
        roadmapReady = true
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
