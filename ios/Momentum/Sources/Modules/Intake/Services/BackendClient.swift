import Foundation
import Supabase

enum BackendError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int, data: Data)
    case unauthorized

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return String(localized: "intake.error.network", table: "Intake")
        case let .httpError(code, _):
            return String(localized: "intake.error.server", table: "Intake") + " (\(code))"
        case .unauthorized:
            return String(localized: "intake.error.network", table: "Intake")
        }
    }
}

final class BackendClient {
    static let shared = BackendClient()

    #if targetEnvironment(simulator)
        let baseURLString = "http://localhost:3000/api"
    #else
        let baseURLString = "https://backend.momentum-ai.app/api"
    #endif
    private lazy var baseURL = URL(string: baseURLString)!
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    private init() {}

    func request<T: Decodable>(method: String, path: String, body: (any Encodable)? = nil) async throws -> T {
        let encodedBody: Data? = if let body { try encoder.encode(body) } else { nil }

        func perform(token: String) async throws -> (Data, HTTPURLResponse) {
            guard let url = URL(string: "\(baseURL.absoluteString)/\(path)") else {
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

        let session = try await Supabase.client.auth.session
        let (data, httpResponse) = try await perform(token: session.accessToken)

        if httpResponse.statusCode == 401 {
            let refreshed = try await Supabase.client.auth.refreshSession()
            let (retryData, retryResponse) = try await perform(token: refreshed.accessToken)
            if retryResponse.statusCode == 401 {
                throw BackendError.unauthorized
            }
            guard (200 ... 299).contains(retryResponse.statusCode) else {
                throw BackendError.httpError(statusCode: retryResponse.statusCode, data: retryData)
            }
            return try decoder.decode(T.self, from: retryData)
        }

        guard (200 ... 299).contains(httpResponse.statusCode) else {
            throw BackendError.httpError(statusCode: httpResponse.statusCode, data: data)
        }

        return try decoder.decode(T.self, from: data)
    }

    func requestVoid(method: String, path: String, body: (any Encodable)? = nil) async throws {
        let encodedBody: Data? = if let body { try encoder.encode(body) } else { nil }

        func perform(token: String) async throws -> HTTPURLResponse {
            guard let url = URL(string: "\(baseURL.absoluteString)/\(path)") else {
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

        let session = try await Supabase.client.auth.session
        let httpResponse = try await perform(token: session.accessToken)

        if httpResponse.statusCode == 401 {
            let refreshed = try await Supabase.client.auth.refreshSession()
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

    func uploadAudio<T: Decodable>(path: String, audioData: Data, filename: String) async throws -> T {
        func perform(token: String) async throws -> (Data, HTTPURLResponse) {
            guard let url = URL(string: "\(baseURL.absoluteString)/\(path)") else {
                throw BackendError.invalidResponse
            }
            let boundary = UUID().uuidString
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            var body = Data()
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"audio\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: audio/wav\r\n\r\n".data(using: .utf8)!)
            body.append(audioData)
            body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
            request.httpBody = body
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw BackendError.invalidResponse
            }
            return (data, httpResponse)
        }

        let session = try await Supabase.client.auth.session
        let (data, httpResponse) = try await perform(token: session.accessToken)

        if httpResponse.statusCode == 401 {
            let refreshed = try await Supabase.client.auth.refreshSession()
            let (retryData, retryResponse) = try await perform(token: refreshed.accessToken)
            if retryResponse.statusCode == 401 {
                throw BackendError.unauthorized
            }
            guard (200 ... 299).contains(retryResponse.statusCode) else {
                throw BackendError.httpError(statusCode: retryResponse.statusCode, data: retryData)
            }
            return try decoder.decode(T.self, from: retryData)
        }

        guard (200 ... 299).contains(httpResponse.statusCode) else {
            throw BackendError.httpError(statusCode: httpResponse.statusCode, data: data)
        }

        return try decoder.decode(T.self, from: data)
    }

    func requestAudioData(path: String, body: (any Encodable)? = nil) async throws -> Data {
        let encodedBody: Data? = if let body { try encoder.encode(body) } else { nil }

        func perform(token: String) async throws -> (Data, HTTPURLResponse) {
            guard let url = URL(string: "\(baseURL.absoluteString)/\(path)") else {
                throw BackendError.invalidResponse
            }
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = encodedBody
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw BackendError.invalidResponse
            }
            return (data, httpResponse)
        }

        let session = try await Supabase.client.auth.session
        let (data, httpResponse) = try await perform(token: session.accessToken)

        if httpResponse.statusCode == 401 {
            let refreshed = try await Supabase.client.auth.refreshSession()
            let (retryData, retryResponse) = try await perform(token: refreshed.accessToken)
            if retryResponse.statusCode == 401 {
                throw BackendError.unauthorized
            }
            guard (200 ... 299).contains(retryResponse.statusCode) else {
                throw BackendError.httpError(statusCode: retryResponse.statusCode, data: retryData)
            }
            return retryData
        }

        guard (200 ... 299).contains(httpResponse.statusCode) else {
            throw BackendError.httpError(statusCode: httpResponse.statusCode, data: data)
        }

        return data
    }
}
