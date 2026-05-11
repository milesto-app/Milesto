import Foundation

struct SubscriptionPlan: Identifiable, Equatable {
    let id: String
    let displayPrice: String
    let perMonthDisplay: String?
    let hasIntroOffer: Bool
}
