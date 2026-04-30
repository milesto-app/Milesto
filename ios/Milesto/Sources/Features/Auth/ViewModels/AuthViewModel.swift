import Foundation

@MainActor
@Observable
final class AuthViewModel {
    @ObservationIgnored private let auth: any AuthRepository

    var email = ""
    var password = ""
    private(set) var isLoading = false
    private(set) var isAppleLoading = false
    private(set) var isGoogleLoading = false
    private(set) var errorMessage: String?
    var showErrorAlert = false

    init(auth: any AuthRepository) {
        self.auth = auth
    }

    var authState: AuthState { auth.authState }

    var isEmailValid: Bool {
        AuthValidation.isValidEmail(email)
    }

    var isPasswordValid: Bool {
        password.count >= 8
    }

    var canSubmit: Bool {
        isEmailValid && isPasswordValid && !isLoading
    }

    func signUp() async {
        isLoading = true
        defer { isLoading = false }
        do {
            _ = try await auth.signUp(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
    }

    func signIn() async {
        isLoading = true
        defer { isLoading = false }
        do {
            _ = try await auth.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
    }

    func signInWithApple() async {
        isAppleLoading = true
        defer { isAppleLoading = false }
        do {
            _ = try await auth.signInWithApple()
        } catch AuthError.cancelled {
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
    }

    func signInWithGoogle() async {
        isGoogleLoading = true
        do {
            try await auth.signInWithGoogle()
        } catch {
            isGoogleLoading = false
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
    }

    func handleAuthStateChange(_ state: AuthState) {
        switch state {
        case .authenticated:
            isGoogleLoading = false
        case let .error(message):
            if isGoogleLoading {
                isGoogleLoading = false
                errorMessage = message
                showErrorAlert = true
            }
        default:
            break
        }
    }
}
