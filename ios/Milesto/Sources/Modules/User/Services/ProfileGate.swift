import SwiftData
import SwiftUI

@MainActor
@Observable
final class ProfileGate {
    var hasSynced = false
    var profileComplete = false
    var goalComplete = false
    var roadmapReady = false
    var activeGoalId: String?
    var connectionError = false

    func resetForRetry() {
        hasSynced = false
    }

    func sync(userId: String, modelContext: ModelContext, localProfile: Profile?, localGoals: [Goal]) async {
        connectionError = false
        let locallyComplete = localProfile?.isProfileComplete == true
        if locallyComplete {
            profileComplete = true
            resolveGoalState(userId: userId, localGoals: localGoals)
        }
        do {
            try await ProfileSyncService.shared.sync(userId: userId, in: modelContext)
        } catch {
            connectionError = true
            return
        }
        await syncGoals(userId: userId, modelContext: modelContext, localGoals: localGoals)
        let remoteComplete = localProfile?.isProfileComplete == true
        if locallyComplete, !remoteComplete {
            profileComplete = false
            goalComplete = false
            roadmapReady = false
            activeGoalId = nil
        } else if remoteComplete {
            profileComplete = true
            resolveGoalState(userId: userId, localGoals: localGoals)
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

    func handleGoalChanged(_ newGoalId: String, localGoals: [Goal]) {
        guard newGoalId != activeGoalId else { return }
        activeGoalId = newGoalId
        guard let goal = localGoals.first(where: { $0.id == newGoalId }) else { return }

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

    private func syncGoals(userId: String, modelContext: ModelContext, localGoals: [Goal]) async {
        guard let goals = try? await GoalAPIService.shared.listGoals() else { return }
        let remoteIds = Set(goals.map { $0.id })
        for dto in goals {
            let dtoId = dto.id
            let descriptor = FetchDescriptor<Goal>(predicate: #Predicate { goal in
                goal.id == dtoId
            })
            let existing = try? modelContext.fetch(descriptor).first
            if let existing {
                existing.status = dto.status
                existing.title = dto.title
                existing.goalDescription = dto.goalDescription
            } else {
                let localGoal = Goal(
                    id: dto.id,
                    userId: dto.userId,
                    title: dto.title,
                    goalDescription: dto.goalDescription,
                    status: dto.status,
                    createdAt: Date()
                )
                modelContext.insert(localGoal)
            }
        }
        let stale = localGoals.filter {
            $0.userId.caseInsensitiveCompare(userId) == .orderedSame && !remoteIds.contains($0.id)
        }
        for goal in stale {
            modelContext.delete(goal)
        }
    }

    private func resolveGoalState(userId: String, localGoals: [Goal]) {
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

    func checkRoadmapStatus(goalId: String) async -> Bool {
        guard let roadmap = try? await RoadmapAPIService.shared.getRoadmap(goalId: goalId) else {
            return false
        }
        return roadmap.status == .complete
    }
}
