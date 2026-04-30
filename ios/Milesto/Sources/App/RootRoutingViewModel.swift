import Foundation
import SwiftData
import SwiftUI

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
    @ObservationIgnored private let goals: any GoalRepository
    @ObservationIgnored private let roadmap: any RoadmapRepository
    @ObservationIgnored private let container: ModelContainer

    init(
        profile: any ProfileRepository,
        goals: any GoalRepository,
        roadmap: any RoadmapRepository,
        container: ModelContainer
    ) {
        self.profile = profile
        self.goals = goals
        self.roadmap = roadmap
        self.container = container
    }

    private var context: ModelContext { container.mainContext }

    func resetForRetry() {
        hasSynced = false
    }

    func sync(userId: String) async {
        connectionError = false
        refreshLocalSnapshots(userId: userId)

        let locallyComplete = localProfile?.isProfileComplete == true
        if locallyComplete {
            profileComplete = true
            resolveGoalState(userId: userId)
        }

        do {
            try await profile.sync(userId: userId)
        } catch {
            connectionError = true
            return
        }

        await syncGoals(userId: userId)
        refreshLocalSnapshots(userId: userId)

        let remoteComplete = localProfile?.isProfileComplete == true
        if locallyComplete, !remoteComplete {
            profileComplete = false
            goalComplete = false
            roadmapReady = false
            activeGoalId = nil
        } else if remoteComplete {
            profileComplete = true
            resolveGoalState(userId: userId)
            if goalComplete,
               let goal = localGoals.first(where: { $0.id == activeGoalId }),
               goal.status == ProfileStatus.intakeCompleted.rawValue
            {
                let checkedGoalId = goal.id
                let hasRoadmap = await checkRoadmapStatus(goalId: checkedGoalId)
                if activeGoalId == checkedGoalId {
                    roadmapReady = hasRoadmap
                }
            }
        }
        hasSynced = true
    }

    func handleGoalChanged(_ newGoalId: String) {
        guard newGoalId != activeGoalId else { return }
        activeGoalId = newGoalId

        let descriptor = FetchDescriptor<Goal>(predicate: #Predicate { $0.id == newGoalId })
        guard let goal = try? context.fetch(descriptor).first else { return }

        switch goal.status {
        case "active":
            withAnimation(.easeInOut(duration: 0.4)) {
                goalComplete = true
                roadmapReady = true
            }
        case ProfileStatus.intakeCompleted.rawValue:
            withAnimation(.easeInOut(duration: 0.4)) {
                goalComplete = true
                roadmapReady = false
            }
            Task {
                let hasRoadmap = await checkRoadmapStatus(goalId: newGoalId)
                guard activeGoalId == newGoalId else { return }
                withAnimation(.easeInOut(duration: 0.4)) {
                    roadmapReady = hasRoadmap
                }
            }
        default:
            withAnimation(.easeInOut(duration: 0.4)) {
                goalComplete = false
                roadmapReady = false
            }
        }
    }

    func markRoadmapReady() {
        roadmapReady = true
        guard let activeGoalId else { return }
        let descriptor = FetchDescriptor<Goal>(predicate: #Predicate { $0.id == activeGoalId })
        if let goal = try? context.fetch(descriptor).first {
            goal.status = "active"
            try? context.save()
        }
    }

    private func refreshLocalSnapshots(userId: String) {
        let profileDescriptor = FetchDescriptor<Profile>(
            predicate: #Predicate { $0.userId == userId }
        )
        localProfile = (try? context.fetch(profileDescriptor))?.first

        let goalDescriptor = FetchDescriptor<Goal>()
        localGoals = (try? context.fetch(goalDescriptor)) ?? []
    }

    private func syncGoals(userId: String) async {
        guard let goals = try? await goals.listGoals() else { return }
        let remoteIds = Set(goals.map { $0.id })
        for dto in goals {
            let dtoId = dto.id
            let descriptor = FetchDescriptor<Goal>(predicate: #Predicate { goal in
                goal.id == dtoId
            })
            let existing = try? context.fetch(descriptor).first
            if let existing {
                existing.status = dto.status
                existing.title = dto.title
                existing.goalDescription = dto.goalDescription
            } else {
                context.insert(Goal(
                    id: dto.id,
                    userId: dto.userId,
                    title: dto.title,
                    goalDescription: dto.goalDescription,
                    status: dto.status,
                    createdAt: Date()
                ))
            }
        }
        let stale = localGoals.filter {
            $0.userId.caseInsensitiveCompare(userId) == .orderedSame && !remoteIds.contains($0.id)
        }
        for goal in stale {
            context.delete(goal)
        }
        try? context.save()
    }

    private func resolveGoalState(userId: String) {
        let userGoals = localGoals.filter { $0.userId.caseInsensitiveCompare(userId) == .orderedSame }
        let statusPriority = ["active", "intake_completed", "profile_generating", "intake_in_progress"]
        let matchingGoal = userGoals
            .sorted { a, b in
                let aIndex = statusPriority.firstIndex(of: a.status) ?? statusPriority.count
                let bIndex = statusPriority.firstIndex(of: b.status) ?? statusPriority.count
                return aIndex < bIndex
            }
            .first
        activeGoalId = matchingGoal?.id

        guard let status = matchingGoal?.status else {
            goalComplete = false
            roadmapReady = false
            return
        }

        switch status {
        case "active":
            goalComplete = true
            roadmapReady = true
        case ProfileStatus.intakeCompleted.rawValue:
            goalComplete = true
            roadmapReady = false
        case "intake_in_progress", "profile_generating", ProfileStatus.generationFailed.rawValue:
            goalComplete = false
            roadmapReady = false
        default:
            goalComplete = false
            roadmapReady = false
        }
    }

    private func checkRoadmapStatus(goalId: String) async -> Bool {
        guard let dto = try? await roadmap.getRoadmap(goalId: goalId) else {
            return false
        }
        return dto.status == .complete
    }
}
