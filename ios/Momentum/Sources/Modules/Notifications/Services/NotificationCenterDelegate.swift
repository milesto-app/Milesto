import UIKit
import UserNotifications

@MainActor
final class NotificationCenterDelegate: NSObject {
    static let shared = NotificationCenterDelegate()

    nonisolated static let genericCategoryIdentifier = "MOMENTUM_GENERIC"
    nonisolated static let whyActionIdentifier = "WHY_THIS"

    override private init() {
        super.init()
    }

    func register() {
        let center = UNUserNotificationCenter.current()
        center.delegate = self

        let whyAction = UNNotificationAction(
            identifier: Self.whyActionIdentifier,
            title: String(localized: "notifications.action.why", table: "Notifications"),
            options: [.foreground]
        )
        let generic = UNNotificationCategory(
            identifier: Self.genericCategoryIdentifier,
            actions: [whyAction],
            intentIdentifiers: [],
            options: []
        )
        center.setNotificationCategories([generic])
    }
}

extension NotificationCenterDelegate: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _: UNUserNotificationCenter,
        willPresent _: UNNotification,
        withCompletionHandler completionHandler: @escaping @Sendable (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
        Task { await ActivityAPIService.shared.recordForeground() }
    }

    nonisolated func userNotificationCenter(
        _: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping @Sendable () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        let actionId = response.actionIdentifier
        let payload = NotificationPayload(userInfo: userInfo)

        if let jobId = payload.jobId, let deviceToken = SharedKeychain.apnsDeviceToken() {
            Task.detached {
                await NotificationTelemetryAPIService.shared.reportOpened(jobId: jobId, deviceToken: deviceToken)
            }
        }

        let url: URL? = if actionId == Self.whyActionIdentifier {
            payload.whyDeeplink
        } else {
            payload.ctaDeeplink
        }

        Task { @MainActor in
            if let url {
                if !DeepLinkRouter.shared.handle(url), UIApplication.shared.canOpenURL(url) {
                    await UIApplication.shared.open(url)
                }
            }
            completionHandler()
        }
    }
}
