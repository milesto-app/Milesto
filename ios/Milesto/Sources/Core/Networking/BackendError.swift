import Foundation

nonisolated struct GenerationLimitUsage: Decodable {
    let used: Int
    let limit: Int
    let isPro: Bool
    let resetsAt: String
}

private nonisolated struct LimitErrorBody: Decodable {
    let error: String?
    let usage: GenerationLimitUsage?
}

enum BackendError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int, data: Data)
    case unauthorized
    case generationLimitReached(usage: GenerationLimitUsage)
    case subscriptionRequired

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return String(localized: "intake.error.network", table: "Intake")
        case let .httpError(code, _):
            return String(localized: "intake.error.server", table: "Intake") + " (\(code))"
        case .unauthorized:
            return String(localized: "intake.error.network", table: "Intake")
        case .generationLimitReached:
            return String(localized: "usage.limit.reached.message", table: "Paywall")
        case .subscriptionRequired:
            return String(localized: "paywall.error.generic", table: "Paywall")
        }
    }

    static func from(statusCode: Int, data: Data) -> BackendError {
        if statusCode == 402 {
            Task { @MainActor in
                await SubscriptionService.shared.handleBackendSubscriptionRequired()
            }
            return .subscriptionRequired
        }
        if statusCode == 429 {
            if let body = try? JSONDecoder().decode(LimitErrorBody.self, from: data),
               body.error == "GENERATION_LIMIT_REACHED",
               let usage = body.usage
            {
                return .generationLimitReached(usage: usage)
            }
        }
        return .httpError(statusCode: statusCode, data: data)
    }
}
