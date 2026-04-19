import UserNotifications

final class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttempt: UNMutableNotificationContent?

    #if DEBUG
        private let backendBaseURL = URL(string: "http://localhost:3000/api")!
    #else
        private let backendBaseURL = URL(string: "https://backend.momentum-ai.app/api")!
    #endif

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        bestAttempt = (request.content.mutableCopy() as? UNMutableNotificationContent)

        guard let bestAttempt else {
            contentHandler(request.content)
            return
        }

        let userInfo = request.content.userInfo
        guard let jobId = userInfo["job_id"] as? String,
              let deviceToken = SharedKeychain.apnsDeviceToken(),
              let session = SharedKeychain.supabaseAccessToken(),
              session.expiresAt > Date()
        else {
            contentHandler(bestAttempt)
            return
        }

        reportReceived(jobId: jobId, deviceToken: deviceToken, bearer: session.token) { [weak self] in
            guard let self, let bestAttempt = self.bestAttempt else { return }
            contentHandler(bestAttempt)
        }
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler, let bestAttempt {
            contentHandler(bestAttempt)
        }
    }

    private func reportReceived(
        jobId: String,
        deviceToken: String,
        bearer: String,
        completion: @escaping () -> Void
    ) {
        let url = backendBaseURL.appendingPathComponent("notifications/delivery/received")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10

        let body: [String: String] = ["job_id": jobId, "device_token": deviceToken]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        let task = URLSession.shared.dataTask(with: request) { _, _, _ in
            completion()
        }
        task.resume()
    }
}
