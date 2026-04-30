import SwiftUI

struct AuthContainerView: View {
    @State private var model = AuthViewModel(auth: SupabaseAuthRepository.shared)

    private enum AuthRoute: Hashable {
        case emailAuth
    }

    @State private var path: [AuthRoute] = []

    var body: some View {
        NavigationStack(path: $path) {
            AuthView(
                onSignInWithApple: { Task { await model.signInWithApple() } },
                onSignInWithGoogle: { Task { await model.signInWithGoogle() } },
                onContinueWithEmail: { path.append(.emailAuth) },
                isAppleLoading: model.isAppleLoading,
                isGoogleLoading: model.isGoogleLoading
            )
            .navigationDestination(for: AuthRoute.self) { route in
                switch route {
                case .emailAuth:
                    AuthEmailView(
                        email: $model.email,
                        password: $model.password,
                        isLoading: model.isLoading,
                        onSignUp: { Task { await model.signUp() } },
                        onSignIn: { Task { await model.signIn() } }
                    )
                }
            }
        }
        .alert(String(localized: "auth.error.title", table: "Auth"), isPresented: $model.showErrorAlert) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            Text(model.errorMessage ?? "")
        }
        .onChange(of: model.authState) { _, newState in
            model.handleAuthStateChange(newState)
        }
    }
}

#Preview {
    AuthContainerView()
}
