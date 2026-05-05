import SwiftUI

private enum AuthLoadingTarget: Equatable {
    case apple
    case google
    case email
}

private enum AuthEmailAction {
    case signUp
    case signIn
}

struct AuthContainerView: View {
    @Environment(AppEnv.self) private var env

    @State private var showEmailAuth = false
    @State private var loadingTarget: AuthLoadingTarget?
    @State private var email = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var showErrorAlert = false

    var body: some View {
        NavigationStack {
            AuthView(
                onSignInWithApple: signInWithApple,
                onSignInWithGoogle: signInWithGoogle,
                onContinueWithEmail: { showEmailAuth = true },
                isAppleLoading: loadingTarget == .apple,
                isGoogleLoading: loadingTarget == .google
            )
            .navigationDestination(isPresented: $showEmailAuth) {
                AuthEmailView(
                    email: $email,
                    password: $password,
                    isLoading: loadingTarget == .email,
                    onSignUp: { authenticateWithEmail(.signUp) },
                    onSignIn: { authenticateWithEmail(.signIn) }
                )
            }
        }
        .appBackground()
        .alert(String(localized: "auth.error.title", table: "Auth"), isPresented: $showErrorAlert) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            AppText(verbatim: errorMessage ?? "", style: .body)
        }
        .onChange(of: env.auth.authState) { _, newState in
            handleAuthStateChange(newState)
        }
    }

    private func signInWithApple() {
        Task {
            loadingTarget = .apple
            defer { loadingTarget = nil }

            do {
                _ = try await env.auth.signInWithApple()
            } catch AuthError.cancelled {
            } catch {
                present(error.localizedDescription)
            }
        }
    }

    private func signInWithGoogle() {
        Task {
            loadingTarget = .google

            do {
                try await env.auth.signInWithGoogle()
            } catch AuthError.cancelled {
                loadingTarget = nil
            } catch {
                loadingTarget = nil
                present(error.localizedDescription)
            }
        }
    }

    private func authenticateWithEmail(_ action: AuthEmailAction) {
        Task {
            loadingTarget = .email
            defer { loadingTarget = nil }

            do {
                switch action {
                case .signUp:
                    _ = try await env.auth.signUp(email: email, password: password)
                case .signIn:
                    _ = try await env.auth.signIn(email: email, password: password)
                }
            } catch {
                present(error.localizedDescription)
            }
        }
    }

    private func handleAuthStateChange(_ state: AuthState) {
        switch state {
        case .authenticated:
            loadingTarget = nil
        case let .error(message) where loadingTarget == .google:
            loadingTarget = nil
            present(message)
        default:
            break
        }
    }

    private func present(_ message: String) {
        errorMessage = message
        showErrorAlert = true
    }
}
