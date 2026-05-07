import Foundation

final class ApiClient {
    static let shared = ApiClient()

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
                throw ApiError.invalidResponse
            }
            var request = URLRequest(url: url)
            request.httpMethod = method
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = encodedBody
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw ApiError.invalidResponse
            }
            return (data, httpResponse)
        }

        let token = try await AuthSession.accessToken()
        let (data, httpResponse) = try await perform(token: token)

        if httpResponse.statusCode == 401 {
            let refreshedToken = try await AuthSession.refreshAccessToken()
            let (retryData, retryResponse) = try await perform(token: refreshedToken)
            if retryResponse.statusCode == 401 {
                throw ApiError.unauthorized
            }
            guard (200 ... 299).contains(retryResponse.statusCode) else {
                throw ApiError.from(statusCode: retryResponse.statusCode, data: retryData)
            }
            return try decoder.decode(T.self, from: retryData)
        }

        guard (200 ... 299).contains(httpResponse.statusCode) else {
            throw ApiError.from(statusCode: httpResponse.statusCode, data: data)
        }

        return try decoder.decode(T.self, from: data)
    }

    func requestVoid(method: String, path: String, body: (any Encodable)? = nil) async throws {
        let encodedBody: Data? = if let body { try encoder.encode(body) } else { nil }

        func perform(token: String) async throws -> HTTPURLResponse {
            guard let url = URL(string: "\(baseURLString)/\(path)") else {
                throw ApiError.invalidResponse
            }
            var request = URLRequest(url: url)
            request.httpMethod = method
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = encodedBody
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw ApiError.invalidResponse
            }
            return httpResponse
        }

        let token = try await AuthSession.accessToken()
        let httpResponse = try await perform(token: token)

        if httpResponse.statusCode == 401 {
            let refreshedToken = try await AuthSession.refreshAccessToken()
            let retryResponse = try await perform(token: refreshedToken)
            if retryResponse.statusCode == 401 {
                throw ApiError.unauthorized
            }
            guard (200 ... 299).contains(retryResponse.statusCode) else {
                throw ApiError.httpError(statusCode: retryResponse.statusCode, data: Data())
            }
            return
        }

        guard (200 ... 299).contains(httpResponse.statusCode) else {
            throw ApiError.httpError(statusCode: httpResponse.statusCode, data: Data())
        }
    }
}
