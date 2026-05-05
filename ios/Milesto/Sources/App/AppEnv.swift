import SwiftData

@MainActor
@Observable
final class AppEnv {
    let auth: SupabaseAuthRepository
    let subscription: SyncingSubscriptionRepository
    let profile: SyncingProfileRepository
    let goals: SyncingGoalRepository
    let intake: SupabaseIntakeRepository
    let intakeFlow: SyncingIntakeFlowRepository
    let onboarding: SyncingOnboardingRepository
    let settings: SyncingSettingsRepository
    let roadmap: SyncingRoadmapRepository
    let chat: SyncingChatRepository
    let stats: SyncingStatsRepository

    init(modelContext: ModelContext) {
        auth = SupabaseAuthRepository()
        subscription = SyncingSubscriptionRepository(modelContext: modelContext)
        profile = SyncingProfileRepository(modelContext: modelContext, auth: auth)
        goals = SyncingGoalRepository(modelContext: modelContext)
        intake = SupabaseIntakeRepository()
        intakeFlow = SyncingIntakeFlowRepository(goals: goals)
        onboarding = SyncingOnboardingRepository(profile: profile)
        settings = SyncingSettingsRepository(profile: profile, goals: goals, modelContext: modelContext)
        roadmap = SyncingRoadmapRepository(modelContext: modelContext, goals: goals)
        chat = SyncingChatRepository(modelContext: modelContext)
        stats = SyncingStatsRepository(modelContext: modelContext)
    }
}
