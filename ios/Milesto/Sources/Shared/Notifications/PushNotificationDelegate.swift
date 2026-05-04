import OSLog
import UIKit

private let pushDelegateLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto", category: "PushNotificationDelegate")

final class PushNotificationDelegate: NSObject, UIApplicationDelegate {
    func application(
        _: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { await NotificationService.shared.registerToken(deviceToken) }
    }

    func application(
        _: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        pushDelegateLogger.error("Remote notification registration failed: \(String(describing: error), privacy: .public)")
    }
}
