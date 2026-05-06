import Foundation

@MainActor
final class ChatRemote {
    private let baseURL: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init() {
        guard let url = URL(string: ApiClient.shared.baseURLString) else {
            preconditionFailure("Invalid api base URL")
        }
        baseURL = url
    }

    func listConversations(goalId: String) async throws -> [ChatConversationDTO] {
        try await ApiClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/conversations"
        )
    }

    func getConversationMessages(conversationId: String) async throws -> [ChatMessage] {
        let rows: [ChatMessageDTO] = try await ApiClient.shared.request(
            method: "GET",
            path: "conversations/\(conversationId)/messages"
        )

        return rows
            .filter { ($0.role == "user" || $0.role == "assistant") && $0.content != nil }
            .map { remote in
                ChatMessage(
                    id: remote.id,
                    role: remote.role == "user" ? .user : .assistant,
                    content: remote.content ?? ""
                )
            }
    }

    func deleteConversation(conversationId: String) async throws {
        try await ApiClient.shared.requestVoid(
            method: "DELETE",
            path: "conversations/\(conversationId)"
        )
    }

    func sendMessage(conversationId: String?, goalId: String, content: String) -> AsyncThrowingStream<ChatStreamEvent, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    func buildRequest(token: String) throws -> URLRequest {
                        guard let url = URL(string: "\(baseURL.absoluteString)/chat/messages") else {
                            throw ApiError.invalidResponse
                        }
                        var request = URLRequest(url: url)
                        request.httpMethod = "POST"
                        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                        var body: [String: String] = [
                            "goalId": goalId,
                            "content": content,
                        ]
                        if let conversationId {
                            body["conversationId"] = conversationId
                        }
                        request.httpBody = try encoder.encode(body)
                        return request
                    }

                    let token = try await AuthSession.accessToken()
                    var request = try buildRequest(token: token)
                    var (bytes, response) = try await URLSession.shared.bytes(for: request)

                    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 401 {
                        let refreshedToken = try await AuthSession.refreshAccessToken()
                        request = try buildRequest(token: refreshedToken)
                        (bytes, response) = try await URLSession.shared.bytes(for: request)
                    }

                    guard let httpResponse = response as? HTTPURLResponse else {
                        continuation.finish(throwing: ApiError.invalidResponse)
                        return
                    }

                    if httpResponse.statusCode == 401 {
                        continuation.finish(throwing: ApiError.unauthorized)
                        return
                    }

                    guard (200 ... 299).contains(httpResponse.statusCode) else {
                        var errorData = Data()
                        if httpResponse.statusCode == 429 {
                            for try await line in bytes.lines {
                                if let lineData = line.data(using: .utf8) {
                                    errorData.append(lineData)
                                }
                            }
                        }
                        continuation.finish(throwing: ApiError.from(statusCode: httpResponse.statusCode, data: errorData))
                        return
                    }

                    for try await line in bytes.lines {
                        guard line.hasPrefix("data: ") else { continue }
                        let jsonString = String(line.dropFirst(6))
                        guard let data = jsonString.data(using: .utf8) else { continue }
                        let event = try decoder.decode(ChatStreamEvent.self, from: data)
                        continuation.yield(event)
                    }

                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }
}
