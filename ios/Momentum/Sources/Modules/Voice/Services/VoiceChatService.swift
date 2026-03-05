import Foundation
import Observation
import Supabase

@MainActor
@Observable
final class VoiceChatService {
    private(set) var isConnected = false
    private(set) var isSessionActive = false
    private(set) var conversationId: String?

    private var webSocket: URLSessionWebSocketTask?
    private var urlSession: URLSession?

    var onAudioReceived: ((Data) -> Void)?
    var onToolStart: ((String) -> Void)?
    var onToolEnd: ((String) -> Void)?
    var onTurnComplete: (() -> Void)?
    var onInterrupted: (() -> Void)?
    var onSessionWarning: ((Int) -> Void)?
    var onSessionExpired: (() -> Void)?
    var onError: ((String) -> Void)?

    func connect(goalId: String, conversationId: String? = nil) async throws {
        let session = try await Supabase.client.auth.session
        let token = session.accessToken

        let baseURLString = BackendClient.shared.baseURLString
        let wsScheme = baseURLString.hasPrefix("https") ? "wss" : "ws"
        let host = baseURLString
            .replacingOccurrences(of: "https://", with: "")
            .replacingOccurrences(of: "http://", with: "")

        guard let url = URL(string: "\(wsScheme)://\(host)/voice-chat?token=\(token)") else {
            throw BackendError.invalidResponse
        }

        let session2 = URLSession(configuration: .default)
        urlSession = session2
        let task = session2.webSocketTask(with: url)
        webSocket = task
        task.resume()
        isConnected = true

        receiveMessages()

        var payload: [String: Any] = [
            "type": "start_session",
            "goalId": goalId,
        ]
        if let conversationId {
            payload["conversationId"] = conversationId
        }
        let data = try JSONSerialization.data(withJSONObject: payload)
        guard let jsonString = String(data: data, encoding: .utf8) else {
            throw BackendError.invalidResponse
        }
        let message = URLSessionWebSocketTask.Message.string(jsonString)
        try await task.send(message)
    }

    func sendAudio(data: Data) {
        guard let webSocket, isConnected else { return }
        let base64 = data.base64EncodedString()
        let json = "{\"type\":\"audio_data\",\"data\":\"\(base64)\"}"
        let message = URLSessionWebSocketTask.Message.string(json)
        webSocket.send(message) { _ in }
    }

    func disconnect() {
        webSocket?.cancel(with: .normalClosure, reason: nil)
        webSocket = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil
        isConnected = false
        isSessionActive = false
        conversationId = nil
    }

    private func receiveMessages() {
        Task {
            guard let webSocket else { return }
            do {
                let message = try await webSocket.receive()
                handleMessage(message)
                receiveMessages()
            } catch {
                isConnected = false
                isSessionActive = false
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        let data: Data
        switch message {
        case let .string(text):
            guard let textData = text.data(using: .utf8) else { return }
            data = textData
        case let .data(binaryData):
            data = binaryData
        @unknown default:
            return
        }

        guard let event = try? JSONDecoder().decode(VoiceChatEvent.self, from: data) else { return }

        switch event {
        case let .sessionStarted(id):
            conversationId = id
            isSessionActive = true
        case let .audioData(base64):
            guard let audioData = Data(base64Encoded: base64) else { return }
            onAudioReceived?(audioData)
        case let .toolStart(toolName):
            onToolStart?(toolName)
        case let .toolEnd(toolName):
            onToolEnd?(toolName)
        case .turnComplete:
            onTurnComplete?()
        case .interrupted:
            onInterrupted?()
        case let .sessionWarning(remainingMs):
            onSessionWarning?(remainingMs)
        case .sessionExpired:
            isSessionActive = false
            onSessionExpired?()
        case let .error(message):
            onError?(message)
        }
    }
}
