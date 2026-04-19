import Foundation

private actor ActivityThrottle {
    private var lastSent: Date?
    private let interval: TimeInterval = 60

    func shouldSend(now: Date = Date()) -> Bool {
        if let lastSent, now.timeIntervalSince(lastSent) < interval {
            return false
        }
        lastSent = now
        return true
    }
}

final class ActivityAPIService {
    static let shared = ActivityAPIService()

    private let throttle = ActivityThrottle()

    private init() {}

    func recordForeground() async {
        guard await throttle.shouldSend() else { return }
        struct EmptyBody: Encodable {}
        try? await BackendClient.shared.requestVoid(
            method: "POST",
            path: "activity/foreground",
            body: EmptyBody()
        )
    }
}
