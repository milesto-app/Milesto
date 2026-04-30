import SwiftData

@MainActor
@Observable
final class AppDependencies {
    let auth: any AuthSessionProviding
    let authRepository: any AuthRepository
    let entitlement: any EntitlementProviding
    let subscription: any SubscriptionRepository
    let profile: any ProfileRepository
    let goals: any GoalRepository
    let goalRouting: any GoalRoutingRepository
    let intake: any IntakeRepository
    let intakeFlow: any IntakeFlowRepository
    let onboarding: any OnboardingRepository
    let settings: any SettingsRepository
    let roadmapRemote: any RoadmapRepository
    let roadmap: any RoadmapFeatureRepository
    let home: any HomeRepository
    let chat: any ChatRepository
    let stats: any StatsRepository
    let transcription: any TranscriptionRepository

    let container: ModelContainer

    #if DEBUG
        let developerSettings = DeveloperSettings()
    #endif

    init(container: ModelContainer) {
        self.container = container

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
        let goalRoutingRepo = SyncingGoalRepository(remote: supabaseGoal, container: container)
        let supabaseIntake = SupabaseIntakeRepository()
        let intakeFlowRepo = SyncingIntakeFlowRepository(
            goals: supabaseGoal,
            container: container
        )
        let onboardingRepo = SyncingOnboardingRepository(
            profile: syncingProfile,
            container: container
        )
        let chatPurger = ChatLocalDataPurger(container: container)
        let roadmapPurger = RoadmapLocalDataPurger(container: container)
        let statsPurger = StatsLocalDataPurger(container: container)
        let settingsRepo = SyncingSettingsRepository(
            profile: syncingProfile,
            goals: supabaseGoal,
            container: container,
            featurePurgers: [chatPurger, roadmapPurger, statsPurger],
            purgeAdditionalLocalData: {
                try await SubscriptionSyncOutbox.shared.purgeAll()
            }
        )
        let roadmapRemote = SupabaseRoadmapRepository()
        let roadmapRepo = SyncingRoadmapFeatureRepository(
            remote: roadmapRemote,
            container: container
        )
        let homeRepo = SyncingHomeRepository(
            remote: RoadmapBackedHomeRemote(roadmapRemote),
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
        let transcriptionRepo = SupabaseTranscriptionRepository(recorder: AudioRecorderRepository())
        let subscriptionService = SyncingSubscriptionRepository()

        auth = authService
        authRepository = authService
        entitlement = subscriptionService
        subscription = subscriptionService
        BackendClient.shared.setSubscriptionRequiredHandler { [weak subscriptionService] in
            await subscriptionService?.handleBackendSubscriptionRequired()
        }
        profile = syncingProfile
        goals = supabaseGoal
        goalRouting = goalRoutingRepo
        intake = supabaseIntake
        intakeFlow = intakeFlowRepo
        onboarding = onboardingRepo
        settings = settingsRepo
        self.roadmapRemote = roadmapRemote
        roadmap = roadmapRepo
        home = homeRepo
        chat = chatRepo
        stats = statsRepo
        transcription = transcriptionRepo
    }
}
