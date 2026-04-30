import Foundation

enum EntitlementState: Equatable, Sendable {
    case unknown
    case subscribed
    case notSubscribed
    case connectionError
}
