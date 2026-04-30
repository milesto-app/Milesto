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

    init(container: ModelContainer) {
        self.container = container

        let authService = SupabaseAuthRepository.shared
        let supabaseProfile = SupabaseProfileRepository()
        let syncingProfile = SyncingProfileRepository(
            remote: supabaseProfile,
            auth: authService,
            container: container
        )
        let supabaseGoal = SupabaseGoalRepository()
        let supabaseIntake = SupabaseIntakeRepository()
        let intakeFlowRepo = SyncingIntakeFlowRepository(
            goals: supabaseGoal,
            container: container
        )
        let onboardingRepo = SyncingOnboardingRepository(
            profile: syncingProfile,
            container: container
        )
        let settingsRepo = SyncingSettingsRepository(
            profile: syncingProfile,
            goals: supabaseGoal,
            container: container
        )
        let roadmapRemote = SupabaseRoadmapRepository()
        let roadmapRepo = SyncingRoadmapFeatureRepository(
            remote: roadmapRemote,
            container: container
        )
        let homeRepo = SyncingHomeRepository(
            remote: roadmapRemote,
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
        let transcriptionRepo = SupabaseTranscriptionRepository()
        let subscriptionService = SyncingSubscriptionRepository.shared

        auth = authService
        authRepository = authService
        entitlement = subscriptionService
        subscription = subscriptionService
        EntitlementResolver.current = subscriptionService
        profile = syncingProfile
        goals = supabaseGoal
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
