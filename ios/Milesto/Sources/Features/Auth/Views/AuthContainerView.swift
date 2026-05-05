import SwiftUI

struct AuthContainerView: View {
    @Environment(AppEnv.self) private var env

    @State private var model = AuthViewModel()
    @State private var emailModel = AuthEmailViewModel()
    @State private var showEmailAuth = false

    var body: some View {
        @Bindable var bindable = model
        @Bindable var bindableEmail = emailModel
        NavigationStack {
            AuthView(
                onSignInWithApple: { Task { await model.signInWithApple() } },
                onSignInWithGoogle: { Task { await model.signInWithGoogle() } },
                onContinueWithEmail: { showEmailAuth = true },
                isAppleLoading: model.isAppleLoading,
                isGoogleLoading: model.isGoogleLoading
            )
            .navigationDestination(isPresented: $showEmailAuth) {
                AuthEmailView(
                    email: $bindableEmail.email,
                    password: $bindableEmail.password,
                    isLoading: emailModel.isLoading,
                    onSignUp: { Task { await emailModel.signUp() } },
                    onSignIn: { Task { await emailModel.signIn() } }
                )
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
        .onChange(of: env.auth.authState) { _, newState in
            model.handleAuthStateChange(newState)
        }
    }
}
