import SwiftUI

struct AuthContainerView: View {
    @State private var model = AuthViewModel()
    @State private var emailModel = AuthEmailViewModel()

    private enum AuthRoute: Hashable {
        case emailAuth
    }

    @State private var path: [AuthRoute] = []

    var body: some View {
        @Bindable var bindable = model
        @Bindable var bindableEmail = emailModel
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
                        email: $bindableEmail.email,
                        password: $bindableEmail.password,
                        isLoading: emailModel.isLoading,
                        onSignUp: { Task { await emailModel.signUp() } },
                        onSignIn: { Task { await emailModel.signIn() } }
                    )
                }
            }
        }
        .appBackground()
        .alert(String(localized: "auth.error.title", table: "Auth"), isPresented: $bindable.showErrorAlert) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            AppText(verbatim: model.errorMessage ?? "", style: .body)
        }
        .alert(String(localized: "auth.error.title", table: "Auth"), isPresented: $bindableEmail.showErrorAlert) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            AppText(verbatim: emailModel.errorMessage ?? "", style: .body)
        }
        .onChange(of: model.authState) { _, newState in
            model.handleAuthStateChange(newState)
        }
    }
}
