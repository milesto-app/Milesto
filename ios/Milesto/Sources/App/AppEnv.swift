import Foundation

@MainActor
@Observable
final class AppEnv {
    let auth: AuthRepository
    let subscription: SubscriptionRepository
    let user: UserRepository
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
        user = UserRepository(auth: auth)
        goals = GoalRepository()
        intake = IntakeRepository(goals: goals)
        onboarding = OnboardingRepository(user: user)
        settings = SettingsRepository(user: user, goals: goals)
        roadmap = RoadmapRepository()
        chat = ChatRepository()
        stats = StatsRepository()
    }
}
