import SwiftData
import SwiftUI

@main
struct MilestoApp: App {
    @State private var dependencies = AppDependencies(container: Self.container)

    private var authenticatedSessionUserId: String? {
        if case let .authenticated(userId) = dependencies.auth.authState { return userId }
        return nil
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(dependencies)
                .environment(\.transcriptionRepository, dependencies.transcription)
                .task(id: authenticatedSessionUserId) {
                    await prepareAuthenticatedAppSession()
                }
        }
        .modelContainer(Self.container)
    }

    private func prepareAuthenticatedAppSession() async {
        await SubscriptionSyncOutbox.shared.configure(container: Self.container)
        guard authenticatedSessionUserId != nil else { return }
        await dependencies.subscription.reconcileWithBackend()
    }

    private static let container = try! ModelContainer(for: Schema([
        LocalProfile.self,
        LocalGoal.self,
        LocalRoadmap.self,
        LocalMilestone.self,
        LocalWeeklyPlan.self,
        LocalWeeklyTask.self,
        LocalDebrief.self,
        LocalConversation.self,
        LocalChatMessage.self,
        LocalStats.self,
        PendingSubscriptionSync.self,
    ]))
}
