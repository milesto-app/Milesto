import Foundation

@MainActor
@Observable
final class AppEnv {
    let auth: AuthRepository
    let subscription: SubscriptionRepository
    let profile: ProfileRepository
    let goals: GoalRepository
    let intake: IntakeRepository
    let onboarding: OnboardingRepository
    let settings: SettingsRepository
    let roadmap: RoadmapRepository
    let chat: ChatRepository
    let stats: StatsRepository

    init() {
        auth = AuthRepository()
        subscription = SubscriptionRepository()
        profile = ProfileRepository(auth: auth)
        goals = GoalRepository()
        intake = IntakeRepository(goals: goals)
        onboarding = OnboardingRepository(profile: profile)
        settings = SettingsRepository(profile: profile, goals: goals)
        roadmap = RoadmapRepository()
        chat = ChatRepository()
        stats = StatsRepository()
    }
}
