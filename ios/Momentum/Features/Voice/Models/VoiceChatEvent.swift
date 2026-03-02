import Foundation

enum VoiceChatEvent: Decodable {
    case sessionStarted(conversationId: String)
    case audioData(data: String)
    case toolStart(toolName: String)
    case toolEnd(toolName: String)
    case interrupted
    case turnComplete
    case sessionWarning(remainingMs: Int)
    case sessionExpired
    case error(message: String)

    private enum CodingKeys: String, CodingKey {
        case type
        case conversationId
        case data
        case toolName
        case remainingMs
        case message
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "session_started":
            let conversationId = try container.decode(String.self, forKey: .conversationId)
            self = .sessionStarted(conversationId: conversationId)
        case "audio_data":
            let data = try container.decode(String.self, forKey: .data)
            self = .audioData(data: data)
        case "tool_start":
            let toolName = try container.decode(String.self, forKey: .toolName)
            self = .toolStart(toolName: toolName)
        case "tool_end":
            let toolName = try container.decode(String.self, forKey: .toolName)
            self = .toolEnd(toolName: toolName)
        case "interrupted":
            self = .interrupted
        case "turn_complete":
            self = .turnComplete
        case "session_warning":
            let remainingMs = try container.decode(Int.self, forKey: .remainingMs)
            self = .sessionWarning(remainingMs: remainingMs)
        case "session_expired":
            self = .sessionExpired
        case "error":
            let message = try container.decode(String.self, forKey: .message)
            self = .error(message: message)
        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Unknown event type: \(type)"
            )
        }
    }
}
