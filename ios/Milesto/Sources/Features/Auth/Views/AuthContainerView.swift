import SwiftUI

struct AuthContainerView: View {
    @Environment(AppEnv.self) private var dependencies
    @State private var model: AuthViewModel?

    private enum AuthRoute: Hashable {
        case emailAuth
    }

    @State private var path: [AuthRoute] = []

    var body: some View {
        Group {
            if let model {
                content(model: model)
            } else {
                Color("BackgroundBase").ignoresSafeArea()
            }
        }
        .task {
            if model == nil {
                model = AuthViewModel(auth: dependencies.authRepository)
            }
        }
    }

    @ViewBuilder
    private func content(model: AuthViewModel) -> some View {
        @Bindable var bindable = model
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
                        email: $bindable.email,
                        password: $bindable.password,
                        isLoading: model.isLoading,
                        onSignUp: { Task { await model.signUp() } },
                        onSignIn: { Task { await model.signIn() } }
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
        .onChange(of: model.authState) { _, newState in
            model.handleAuthStateChange(newState)
        }
    }
}
