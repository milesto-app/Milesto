import SwiftUI

struct AuthContainerView: View {
    @EnvironmentObject private var authService: AuthService

    private enum AuthRoute: Hashable {
        case emailAuth
    }

    @State private var email: String = ""
    @State private var password: String = ""

    @State private var path: [AuthRoute] = []
    @State private var isLoading = false
    @State private var isAppleLoading = false
    @State private var isGoogleLoading = false
    @State private var errorMessage: String?
    @State private var showErrorAlert = false

    var body: some View {
        NavigationStack(path: $path) {
            AuthView(
                onSignInWithApple: { performAppleSignIn() },
                onSignInWithGoogle: { performGoogleSignIn() },
                onContinueWithEmail: { path.append(.emailAuth) },
                isAppleLoading: isAppleLoading,
                isGoogleLoading: isGoogleLoading
            )
            .background { AnimatedBackground().ignoresSafeArea() }
            .navigationDestination(for: AuthRoute.self) { route in
                switch route {
                case .emailAuth:
                    AuthEmailView(
                        email: $email,
                        password: $password,
                        isLoading: isLoading,
                        onSignUp: { performSignUp() },
                        onSignIn: { performSignIn() }
                    )
                    .background { AnimatedBackground().ignoresSafeArea() }
                }
            }
        }
        .alert(String(localized: "auth.error.title", table: "Auth"), isPresented: $showErrorAlert) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) { }
        } message: {
            Text(errorMessage ?? "")
        }
        .onChange(of: authService.authState) { _, newState in
            switch newState {
            case .authenticated:
                isGoogleLoading = false
            case .error(let message):
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

    private func performSignUp() {
        Task { @MainActor in
            isLoading = true
            defer { isLoading = false }

            do {
                _ = try await authService.signUp(email: email, password: password)
            } catch {
                errorMessage = error.localizedDescription
                showErrorAlert = true
            }
        }
    }

    private func performSignIn() {
        Task { @MainActor in
            isLoading = true
            defer { isLoading = false }

            do {
                _ = try await authService.signIn(email: email, password: password)
            } catch {
                errorMessage = error.localizedDescription
                showErrorAlert = true
            }
        }
    }

    private func performAppleSignIn() {
        Task { @MainActor in
            isAppleLoading = true
            defer { isAppleLoading = false }

            do {
                _ = try await authService.signInWithApple()
            } catch AuthError.cancelled {
            } catch {
                errorMessage = error.localizedDescription
                showErrorAlert = true
            }
        }
    }

    private func performGoogleSignIn() {
        Task { @MainActor in
            isGoogleLoading = true

            do {
                try await authService.signInWithGoogle()
            } catch {
                isGoogleLoading = false
                errorMessage = error.localizedDescription
                showErrorAlert = true
            }
        }
    }
}

#Preview {
    AuthContainerView()
        .environmentObject(AuthService.shared)
}
