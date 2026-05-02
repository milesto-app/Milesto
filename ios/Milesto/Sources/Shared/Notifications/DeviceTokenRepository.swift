import Foundation

private struct UnregisterTokenBody: Encodable {
    let token: String
}

final class DeviceTokenRepository {
    static let shared = DeviceTokenRepository()

    private init() {}

    func unregister(token: String) async throws {
        try await ApiClient.shared.requestVoid(
            method: "DELETE",
            path: "notifications/tokens",
            body: UnregisterTokenBody(token: token)
        )
    }
}
