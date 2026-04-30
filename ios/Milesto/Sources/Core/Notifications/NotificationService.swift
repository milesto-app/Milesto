import UIKit
import UserNotifications

private let lastTokenKey = "lastAPNSToken"

final class NotificationService {
    static let shared = NotificationService()

    private init() {}

    func requestPermissionAndRegister() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()

        switch settings.authorizationStatus {
        case .notDetermined:
            let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
            guard granted else { return }
        case .authorized, .provisional:
            break
        default:
            return
        }

        await MainActor.run {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func registerToken(_ tokenData: Data) async {
        let token = tokenData.map { String(format: "%02x", $0) }.joined()

        #if DEBUG
            let environment = "sandbox"
        #else
            let environment = "production"
        #endif

        do {
            try await DeviceTokenRepository.shared.register(token: token, environment: environment)
            UserDefaults.standard.set(token, forKey: lastTokenKey)
        } catch {}
    }

    func unregisterCurrentToken() async {
        guard let token = UserDefaults.standard.string(forKey: lastTokenKey) else { return }
        do {
            try await DeviceTokenRepository.shared.unregister(token: token)
            UserDefaults.standard.removeObject(forKey: lastTokenKey)
        } catch {}
    }
}
