import SwiftData

@MainActor
@Observable
final class AppEnv {
    let auth: AuthRepository
    let subscription: SubscriptionRepository
    let profile: ProfileRepository
    let goals: GoalRepository
    let intake: IntakeRemote
    let intakeFlow: IntakeFlowRepository
    let onboarding: OnboardingRepository
    let settings: SettingsRepository
    let roadmap: RoadmapRepository
    let chat: ChatRepository
    let stats: StatsRepository

    init(modelContext: ModelContext) {
        auth = AuthRepository()
        subscription = SubscriptionRepository(modelContext: modelContext)
        profile = ProfileRepository(modelContext: modelContext, auth: auth)
        goals = GoalRepository(modelContext: modelContext)
        intake = IntakeRemote()
        intakeFlow = IntakeFlowRepository(modelContext: modelContext)
        onboarding = OnboardingRepository(modelContext: modelContext, auth: auth)
        settings = SettingsRepository(modelContext: modelContext, auth: auth)
        roadmap = RoadmapRepository(modelContext: modelContext)
        chat = ChatRepository(modelContext: modelContext)
        stats = StatsRepository(modelContext: modelContext)
    }
}
