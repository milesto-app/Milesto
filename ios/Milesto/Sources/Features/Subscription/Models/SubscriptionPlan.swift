import Foundation

struct SubscriptionPlan: Identifiable, Equatable {
    enum Period: String, Equatable {
        case monthly
        case annual
    }

    let id: String
    let displayName: String
    let displayPrice: String
    let period: Period
}
