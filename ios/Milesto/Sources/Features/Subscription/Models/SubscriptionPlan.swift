import Foundation

struct SubscriptionPlan: Identifiable, Equatable, Sendable {
    enum Period: String, Equatable, Sendable {
        case monthly
        case annual
    }

    let id: String
    let displayName: String
    let displayPrice: String
    let period: Period
}
