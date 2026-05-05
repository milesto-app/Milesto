import Foundation
import Supabase

private struct ChatMessageDTO: Decodable {
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

private struct ConversationWithMessages: Decodable {
    let id: String
    let goalId: String
    let updatedAt: String
    let createdAt: String
    let messages: [ChatMessageDTO]

    private enum CodingKeys: String, CodingKey {
        case id
        case goalId = "goal_id"
        case updatedAt = "updated_at"
        case createdAt = "created_at"
        case messages
    }
}

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

    func listConversations(goalId: String) async throws -> [ConversationSummary] {
        let rows: [ConversationWithMessages] = try await SupabaseConfig.client
            .from("conversations")
            .select("*, messages(id, content, role, created_at)")
            .eq("goal_id", value: goalId)
            .order("updated_at", ascending: false)
            .order("created_at", ascending: true, referencedTable: "messages")
            .execute()
            .value

        return rows.map { row in
            let firstUserMessage = row.messages
                .first { $0.role == "user" && $0.content != nil }
            let preview = firstUserMessage.flatMap { msg -> String? in
                guard let content = msg.content else { return nil }
                return content.count > 100 ? String(content.prefix(100)) : content
            }

            return ConversationSummary(
                id: row.id,
                goalId: row.goalId,
                preview: preview,
                updatedAt: row.updatedAt,
                createdAt: row.createdAt
            )
        }
    }

    func getConversationMessages(conversationId: String) async throws -> [ChatMessage] {
        let rows: [ChatMessageDTO] = try await SupabaseConfig.client
            .from("messages")
            .select()
            .eq("conversation_id", value: conversationId)
            .order("created_at")
            .execute()
            .value

        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        return rows
            .filter { ($0.role == "user" || $0.role == "assistant") && $0.content != nil }
            .map { remote in
                ChatMessage(
                    id: remote.id,
                    role: remote.role == "user" ? .user : .assistant,
                    content: remote.content ?? "",
                    createdAt: dateFormatter.date(from: remote.createdAt) ?? Date()
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

                    let session = try await SupabaseConfig.client.auth.session
                    var request = try buildRequest(token: session.accessToken)
                    var (bytes, response) = try await URLSession.shared.bytes(for: request)

                    if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 401 {
                        let refreshed = try await SupabaseConfig.client.auth.refreshSession()
                        request = try buildRequest(token: refreshed.accessToken)
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
