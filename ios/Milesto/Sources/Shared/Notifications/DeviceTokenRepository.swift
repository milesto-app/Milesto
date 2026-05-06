import Foundation

private struct RegisterTokenBody: Encodable {
    let token: String
    let environment: String
}

final class DeviceTokenRepository {
    static let shared = DeviceTokenRepository()

    private init() {}

    func register(token: String, environment: String) async throws {
        try await ApiClient.shared.requestVoid(
            method: "POST",
            path: "notifications/tokens",
            body: RegisterTokenBody(token: token, environment: environment)
        )
    }
}
