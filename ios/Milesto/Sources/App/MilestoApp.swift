import SwiftData
import SwiftUI

@main
struct MilestoApp: App {
    @UIApplicationDelegateAdaptor(MilestoAppDelegate.self) var appDelegate
    @State private var dependencies: AppDependencies
    @Environment(\.scenePhase) private var scenePhase

    let sharedModelContainer: ModelContainer

    init() {
        let container = MilestoModelContainer.make()
        sharedModelContainer = container
        _dependencies = State(initialValue: AppDependencies(container: container))
    }

    private var authenticatedSessionUserId: String? {
        if case let .authenticated(userId) = dependencies.auth.authState { return userId }
        return nil
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .tint(Color("Brand"))
                .environment(dependencies)
                .environment(\.transcriptionRepository, dependencies.transcription)
                .onOpenURL { url in
                    Task {
                        await dependencies.authRepository.handleDeepLink(url)
                    }
                }
                .task(id: authenticatedSessionUserId) {
                    await prepareAuthenticatedAppSession()
                }
                .onChange(of: scenePhase) { _, newPhase in
                    refreshActiveSceneServicesIfNeeded(phase: newPhase)
                }
        }
        .modelContainer(sharedModelContainer)
    }

    private func prepareAuthenticatedAppSession() async {
        await SubscriptionSyncOutbox.shared.configure(container: sharedModelContainer)
        guard authenticatedSessionUserId != nil else { return }
        await NotificationService.shared.requestPermissionAndRegister()
        await dependencies.subscription.reconcileWithBackend()
    }

    private func refreshActiveSceneServicesIfNeeded(phase: ScenePhase) {
        guard phase == .active, authenticatedSessionUserId != nil else { return }
        Task {
            await NotificationService.shared.requestPermissionAndRegister()
        }
    }
}
