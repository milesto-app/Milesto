import OSLog

private let lastTokenKey = "lastAPNSToken"
private let notificationLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto", category: "Notifications")

final class NotificationService {
    static let shared = NotificationService()

    private init() {}

    func unregisterCurrentToken() async {
        guard let token = UserDefaults.standard.string(forKey: lastTokenKey) else { return }
        do {
            try await DeviceTokenRepository.shared.unregister(token: token)
            UserDefaults.standard.removeObject(forKey: lastTokenKey)
        } catch {
            notificationLogger.error("Failed to unregister APNS token: \(String(describing: error), privacy: .public)")
        }
    }
}
