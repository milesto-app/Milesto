import SwiftUI

@main
struct AppMain: App {
    @UIApplicationDelegateAdaptor(PushNotificationDelegate.self) private var pushDelegate

    private let env: AppEnv

    init() {
        env = AppEnv()
    }

    var body: some Scene {
        WindowGroup {
            AppView()
        }
        .environment(env)
    }
}
