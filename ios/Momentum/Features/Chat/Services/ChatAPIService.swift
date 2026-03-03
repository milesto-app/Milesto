import Foundation
import Supabase

private struct ConversationListResponse: Decodable {
    let conversations: [ConversationSummary]
}

private struct MessageDTO: Decodable {
    let id: String
    let role: String
    let content: String?
    let createdAt: String

    private enum CodingKeys: String, CodingKey {
        case id
        case role
        case content
        case createdAt = "created_at"
    }
}

private struct MessageListResponse: Decodable {
    let messages: [MessageDTO]
}

final class ChatAPIService {
    static let shared = ChatAPIService()

    private let baseURL = URL(string: BackendClient.shared.baseURLString)!
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    private init() {}

    func listConversations(goalId: String) async throws -> [ConversationSummary] {
        let response: ConversationListResponse = try await BackendClient.shared.request(
            method: "GET",
            path: "chat/conversations?goalId=\(goalId)"
        )
        return response.conversations
    }

    func getConversationMessages(conversationId: String) async throws -> [ChatMessage] {
        let response: MessageListResponse = try await BackendClient.shared.request(
            method: "GET",
            path: "chat/conversations/\(conversationId)/messages"
        )

        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        return response.messages
            .filter { ($0.role == "user" || $0.role == "assistant") && $0.content != nil }
            .map { dto in
                ChatMessage(
                    id: dto.id,
                    role: dto.role == "user" ? .user : .assistant,
                    content: dto.content ?? "",
                    createdAt: dateFormatter.date(from: dto.createdAt) ?? Date()
                )
            }
    }

    func deleteConversation(conversationId: String) async throws {
        try await SupabaseConfig.client
            .from("conversations")
            .delete()
            .eq("id", value: conversationId)
            .execute()
    }

    func sendMessage(conversationId: String?, goalId: String, content: String) -> AsyncThrowingStream<ChatStreamEvent, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    let session = try await SupabaseConfig.client.auth.session
                    guard let url = URL(string: "\(baseURL.absoluteString)/chat/messages") else {
                        continuation.finish(throwing: BackendError.invalidResponse)
                        return
                    }

                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

                    var body: [String: String] = [
                        "goalId": goalId,
                        "content": content
                    ]
                    if let conversationId {
                        body["conversationId"] = conversationId
                    }
                    request.httpBody = try encoder.encode(body)

                    let (bytes, response) = try await URLSession.shared.bytes(for: request)

                    guard let httpResponse = response as? HTTPURLResponse else {
                        continuation.finish(throwing: BackendError.invalidResponse)
                        return
                    }

                    if httpResponse.statusCode == 401 {
                        continuation.finish(throwing: BackendError.unauthorized)
                        return
                    }

                    guard (200...299).contains(httpResponse.statusCode) else {
                        continuation.finish(throwing: BackendError.httpError(statusCode: httpResponse.statusCode, data: Data()))
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
