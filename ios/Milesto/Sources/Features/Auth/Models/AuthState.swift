import Foundation

enum AuthState: Equatable {
    case unauthenticated
    case authenticating
    case authenticated(userId: String)
    case error(String)

    static func == (lhs: AuthState, rhs: AuthState) -> Bool {
        switch (lhs, rhs) {
        case (.unauthenticated, .unauthenticated):
            return true
        case (.authenticating, .authenticating):
            return true
        case let (.authenticated(lhsId), .authenticated(rhsId)):
            return lhsId == rhsId
        case let (.error(lhsMsg), .error(rhsMsg)):
            return lhsMsg == rhsMsg
        default:
            return false
        }
    }
}
