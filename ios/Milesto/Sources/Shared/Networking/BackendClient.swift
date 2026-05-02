import Foundation
import Supabase

final class BackendClient {
    static let shared = BackendClient()

    #if targetEnvironment(simulator)
        let baseURLString = "http://localhost:3000/api"
    #else
        let baseURLString = "https://api.milesto.app/api"
    #endif
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    private var onSubscriptionRequired: (@MainActor () async -> Void)?
    private let onSubscriptionRequiredLock = NSLock()

    private init() {}

    func setSubscriptionRequiredHandler(_ handler: @escaping @MainActor () async -> Void) {
        onSubscriptionRequiredLock.lock()
        defer { onSubscriptionRequiredLock.unlock() }
        onSubscriptionRequired = handler
    }

    func notifySubscriptionRequired() {
        onSubscriptionRequiredLock.lock()
        let handler = onSubscriptionRequired
        onSubscriptionRequiredLock.unlock()
        guard let handler else { return }
        Task { @MainActor in
            await handler()
        }
    }

    func request<T: Decodable>(method: String, path: String, body: (any Encodable)? = nil) async throws -> T {
        let encodedBody: Data? = if let body { try encoder.encode(body) } else { nil }

        func perform(token: String) async throws -> (Data, HTTPURLResponse) {
            guard let url = URL(string: "\(baseURLString)/\(path)") else {
                throw BackendError.invalidResponse
            }
            var request = URLRequest(url: url)
            request.httpMethod = method
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = encodedBody
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw BackendError.invalidResponse
            }
            return (data, httpResponse)
        }

        let session = try await SupabaseConfig.client.auth.session
        let (data, httpResponse) = try await perform(token: session.accessToken)

        if httpResponse.statusCode == 401 {
            let refreshed = try await SupabaseConfig.client.auth.refreshSession()
            let (retryData, retryResponse) = try await perform(token: refreshed.accessToken)
            if retryResponse.statusCode == 401 {
                throw BackendError.unauthorized
            }
            guard (200 ... 299).contains(retryResponse.statusCode) else {
                throw BackendError.from(statusCode: retryResponse.statusCode, data: retryData)
            }
            return try decoder.decode(T.self, from: retryData)
        }

        guard (200 ... 299).contains(httpResponse.statusCode) else {
            throw BackendError.from(statusCode: httpResponse.statusCode, data: data)
        }

        return try decoder.decode(T.self, from: data)
    }

    func requestVoid(method: String, path: String, body: (any Encodable)? = nil) async throws {
        let encodedBody: Data? = if let body { try encoder.encode(body) } else { nil }

        func perform(token: String) async throws -> HTTPURLResponse {
            guard let url = URL(string: "\(baseURLString)/\(path)") else {
                throw BackendError.invalidResponse
            }
            var request = URLRequest(url: url)
            request.httpMethod = method
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = encodedBody
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw BackendError.invalidResponse
            }
            return httpResponse
        }

        let session = try await SupabaseConfig.client.auth.session
        let httpResponse = try await perform(token: session.accessToken)

        if httpResponse.statusCode == 401 {
            let refreshed = try await SupabaseConfig.client.auth.refreshSession()
            let retryResponse = try await perform(token: refreshed.accessToken)
            if retryResponse.statusCode == 401 {
                throw BackendError.unauthorized
            }
            guard (200 ... 299).contains(retryResponse.statusCode) else {
                throw BackendError.httpError(statusCode: retryResponse.statusCode, data: Data())
            }
            return
        }

        guard (200 ... 299).contains(httpResponse.statusCode) else {
            throw BackendError.httpError(statusCode: httpResponse.statusCode, data: Data())
        }
    }
}
