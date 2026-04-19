import Foundation

private struct DeliveryBody: Encodable {
    let jobId: String
    let deviceToken: String

    enum CodingKeys: String, CodingKey {
        case jobId = "job_id"
        case deviceToken = "device_token"
    }
}

final class NotificationTelemetryAPIService {
    static let shared = NotificationTelemetryAPIService()

    private init() {}

    func reportReceived(jobId: String, deviceToken: String) async {
        try? await BackendClient.shared.requestVoid(
            method: "POST",
            path: "notifications/delivery/received",
            body: DeliveryBody(jobId: jobId, deviceToken: deviceToken)
        )
    }

    func reportOpened(jobId: String, deviceToken: String) async {
        try? await BackendClient.shared.requestVoid(
            method: "POST",
            path: "notifications/delivery/opened",
            body: DeliveryBody(jobId: jobId, deviceToken: deviceToken)
        )
    }
}
