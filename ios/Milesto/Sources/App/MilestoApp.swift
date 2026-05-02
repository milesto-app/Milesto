import SwiftData
import SwiftUI

@main
struct MilestoApp: App {
    @State private var dependencies: AppDependencies

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
        }
        .modelContainer(container)
    }

    private func prepareAuthenticatedAppSession() async {
        await SubscriptionSyncOutbox.shared.configure(container: container)
        guard authenticatedSessionUserId != nil else { return }
        await dependencies.subscription.reconcileWithBackend()
    }
}
