import Foundation

enum AuthError: LocalizedError {
    case invalidCredentials
    case emailAlreadyInUse
    case networkError
    case cancelled
    case unknown(String)

    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return String(localized: "auth.error.invalidCredentials", table: "Auth")
        case .emailAlreadyInUse:
            return String(localized: "auth.error.emailAlreadyInUse", table: "Auth")
        case .networkError:
            return String(localized: "auth.error.networkError", table: "Auth")
        case .cancelled:
            return nil
        case let .unknown(message):
            return message
        }
    }

    init(from error: Error) {
        if let auth = error as? AuthError { self = auth; return }
        let message = error.localizedDescription.lowercased()
        let matches: ([String]) -> Bool = { keywords in keywords.contains { message.contains($0) } }
        switch true {
        case matches(["invalid", "credentials"]): self = .invalidCredentials
        case matches(["already", "exists", "registered"]): self = .emailAlreadyInUse
        case matches(["network", "connection"]): self = .networkError
        default: self = .unknown(error.localizedDescription)
        }
    }
}
