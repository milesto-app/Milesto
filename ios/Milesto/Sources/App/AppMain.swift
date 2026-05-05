import SwiftData
import SwiftUI

@main
struct AppMain: App {
    @UIApplicationDelegateAdaptor(PushNotificationDelegate.self) private var pushDelegate

    private let container: ModelContainer
    private let env: AppEnv

    init() {
        container = ModelContainerFactory.make()
        env = AppEnv(modelContext: container.mainContext)
    }

    var body: some Scene {
        WindowGroup {
            AppView()
        }
        .modelContainer(container)
        .environment(env)
    }
}
