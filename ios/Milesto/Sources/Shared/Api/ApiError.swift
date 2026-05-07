import Foundation

nonisolated struct GenerationLimitUsageDTO: Decodable {
    let used: Int
    let limit: Int
    let resetsAt: String
}

private nonisolated struct LimitErrorBodyDTO: Decodable {
    let error: String?
    let usage: GenerationLimitUsageDTO?
}

enum ApiError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int, data: Data)
    case unauthorized
    case generationLimitReached(usage: GenerationLimitUsageDTO)
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

    static func from(statusCode: Int, data: Data) -> ApiError {
        if statusCode == 402 {
            ApiClient.shared.notifySubscriptionRequired()
            return .subscriptionRequired
        }
        if statusCode == 429 {
            if let body = try? JSONDecoder().decode(LimitErrorBodyDTO.self, from: data),
               body.error == "GENERATION_LIMIT_REACHED",
               let usage = body.usage
            {
                return .generationLimitReached(usage: usage)
            }
        }
        return .httpError(statusCode: statusCode, data: data)
    }
}
