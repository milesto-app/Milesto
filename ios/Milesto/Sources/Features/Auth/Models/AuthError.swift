import Foundation

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
        case let .unknown(message):
            return message
        }
    }
}
