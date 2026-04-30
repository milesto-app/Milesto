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

    private var isAuthenticated: Bool {
        if case .authenticated = dependencies.auth.authState { return true }
        return false
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
                .task(id: isAuthenticated) {
                    await SubscriptionSyncOutbox.shared.configure(container: sharedModelContainer)
                    guard isAuthenticated else { return }
                    await NotificationService.shared.requestPermissionAndRegister()
                    await dependencies.subscription.reconcileWithBackend()
                }
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active, isAuthenticated {
                        Task {
                            await NotificationService.shared.requestPermissionAndRegister()
                        }
                    }
                }
        }
        .modelContainer(sharedModelContainer)
    }
}
