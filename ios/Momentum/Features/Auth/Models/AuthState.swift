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
        case (.authenticated(let lhsId), .authenticated(let rhsId)):
            return lhsId == rhsId
        case (.error(let lhsMsg), .error(let rhsMsg)):
            return lhsMsg == rhsMsg
        default:
            return false
        }
    }
}

enum AuthError: LocalizedError {
    case invalidCredentials
    case emailAlreadyInUse
    case weakPassword
    case networkError
    case cancelled
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return String(localized: "auth.error.invalidCredentials", table: "Auth")
        case .emailAlreadyInUse:
            return String(localized: "auth.error.emailAlreadyInUse", table: "Auth")
        case .weakPassword:
            return String(localized: "auth.error.weakPassword", table: "Auth")
        case .networkError:
            return String(localized: "auth.error.networkError", table: "Auth")
        case .cancelled:
            return nil
        case .unknown(let message):
            return message
        }
    }
}
