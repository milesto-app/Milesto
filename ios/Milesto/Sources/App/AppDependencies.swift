import SwiftData

@MainActor
@Observable
final class AppDependencies {
    let auth: any AuthSessionProviding
    let authRepository: any AuthRepository
    let entitlement: any EntitlementProviding
    let subscription: any SubscriptionRepository
    let profile: any ProfileRepository
    let goalRouting: any GoalRoutingRepository
    let intake: any IntakeRepository
    let intakeFlow: any IntakeFlowRepository
    let onboarding: any OnboardingRepository
    let settings: any SettingsRepository
    let roadmap: any RoadmapSummaryRepository
    let weeklyTasks: any WeeklyTaskRepository
    let weeklyPlans: any WeeklyPlanRepository
    let debriefs: any DebriefRepository
    let chat: any ChatRepository
    let stats: any StatsRepository

    #if DEBUG
        let developerSettings = DeveloperSettings()
    #endif

    init(container: ModelContainer) {
        let oauth = OAuthClient()
        let authService = SupabaseAuthRepository(client: SupabaseConfig.client, oauth: oauth)
        let supabaseProfile = SupabaseProfileRepository()
        let syncingProfile = SyncingProfileRepository(
            remote: supabaseProfile,
            auth: authService,
            container: container,
            httpLoader: URLSessionDataLoader()
        )
        let supabaseGoal = SupabaseGoalRepository(client: SupabaseConfig.client, backend: .shared)
        let goalRepo = SyncingGoalRepository(remote: supabaseGoal, container: container)
        let supabaseIntake = SupabaseIntakeRepository()
        let intakeFlowRepo = SyncingIntakeFlowRepository(
            goals: goalRepo
        )
        let onboardingRepo = SyncingOnboardingRepository(
            profile: syncingProfile
        )
        let settingsRepo = SyncingSettingsRepository(
            profile: syncingProfile,
            goals: goalRepo,
            container: container
        )
        let roadmapRemote = SupabaseRoadmapRepository()
        let roadmapRepo = SyncingRoadmapRepository(
            remote: roadmapRemote,
            goals: goalRepo,
            container: container
        )
        let remoteChat = SupabaseChatRepository()
        let chatRepo = SyncingChatRepository(
            remote: remoteChat,
            container: container
        )
        let supabaseStats = SupabaseStatsRepository()
        let statsRepo = SyncingStatsRepository(
            remote: supabaseStats,
            container: container
        )
        let subscriptionService = SyncingSubscriptionRepository()
        Task { await SubscriptionSyncOutbox.shared.configure(container: container) }

        auth = authService
        authRepository = authService
        entitlement = subscriptionService
        subscription = subscriptionService
        BackendClient.shared.setSubscriptionRequiredHandler { [weak subscriptionService] in
            await subscriptionService?.handleBackendSubscriptionRequired()
        }
        profile = syncingProfile
        goalRouting = goalRepo
        intake = supabaseIntake
        intakeFlow = intakeFlowRepo
        onboarding = onboardingRepo
        settings = settingsRepo
        roadmap = roadmapRepo
        weeklyTasks = roadmapRepo
        weeklyPlans = roadmapRepo
        debriefs = roadmapRepo
        chat = chatRepo
        stats = statsRepo
    }
}
