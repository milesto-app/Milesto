import SwiftData
import SwiftUI

@main
struct MilestoApp: App {
    @UIApplicationDelegateAdaptor(MilestoAppDelegate.self) var appDelegate
    @State private var dependencies: AppDependencies
    @Environment(\.scenePhase) private var scenePhase

    let container: ModelContainer

    init() {
        container = MilestoModelContainer.make()
        _dependencies = State(initialValue: AppDependencies(container: container))
    }

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
                .onChange(of: scenePhase) { _, newPhase in
                    refreshActiveSceneServicesIfNeeded(phase: newPhase)
                }
        }
        .modelContainer(container)
    }

    private func prepareAuthenticatedAppSession() async {
        await SubscriptionSyncOutbox.shared.configure(container: container)
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
