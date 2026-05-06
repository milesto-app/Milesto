import Foundation

enum ChatStreamEventDTO: Decodable {
    case messageStart(conversationId: String)
    case textDelta(delta: String)
    case toolStart(toolName: String)
    case toolEnd(toolName: String)
    case messageEnd
    case error(message: String)

    private enum CodingKeys: String, CodingKey {
        case type
        case conversationId
        case delta
        case toolName
        case message
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "message_start":
            let conversationId = try container.decode(String.self, forKey: .conversationId)
            self = .messageStart(conversationId: conversationId)
        case "text_delta":
            let delta = try container.decode(String.self, forKey: .delta)
            self = .textDelta(delta: delta)
        case "tool_start":
            let toolName = try container.decode(String.self, forKey: .toolName)
            self = .toolStart(toolName: toolName)
        case "tool_end":
            let toolName = try container.decode(String.self, forKey: .toolName)
            self = .toolEnd(toolName: toolName)
        case "message_end":
            self = .messageEnd
        case "error":
            let message = try container.decode(String.self, forKey: .message)
            self = .error(message: message)
        default:
            throw DecodingError.dataCorrupted(
                DecodingError.Context(codingPath: [CodingKeys.type], debugDescription: "Unknown event type: \(type)")
            )
        }
    }
}
