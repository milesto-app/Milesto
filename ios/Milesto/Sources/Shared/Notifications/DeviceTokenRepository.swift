import Foundation

private struct RegisterTokenBody: Encodable {
    let token: String
    let environment: String
}

private struct UnregisterTokenBody: Encodable {
    let token: String
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

    func unregister(token: String) async throws {
        try await ApiClient.shared.requestVoid(
            method: "DELETE",
            path: "notifications/tokens",
            body: UnregisterTokenBody(token: token)
        )
    }
}
