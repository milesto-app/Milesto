import SwiftUI

private enum AuthLoadingTarget: Equatable {
    case apple
    case google
}

struct AuthContainerView: View {
    @Environment(AppEnv.self) private var env

    @State private var isEmailSheetPresented = false
    @State private var loadingTarget: AuthLoadingTarget?
    @State private var errorMessage: String?
    @State private var showErrorAlert = false

    var body: some View {
        AuthView(
            onSignInWithApple: signInWithApple,
            onSignInWithGoogle: signInWithGoogle,
            onContinueWithEmail: { isEmailSheetPresented = true },
            isAppleLoading: loadingTarget == .apple,
            isGoogleLoading: loadingTarget == .google
        )
        .appBackground()
        .sheet(isPresented: $isEmailSheetPresented) {
            AuthMagicLinkSheet()
                .presentationDetents([.height(380)])
                .presentationDragIndicator(.visible)
                .presentationBackground(Color("BackgroundSecondary"))
        }
        .alert(String(localized: "auth.error.title", table: "Auth"), isPresented: $showErrorAlert) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            AppText(verbatim: errorMessage ?? "", style: .body)
        }
        .onChange(of: env.auth.status) { _, newState in
            handleAuthStateChange(newState)
        }
    }

    private func signInWithApple() {
        guard loadingTarget == nil else { return }
        loadingTarget = .apple

        Task {
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
        guard loadingTarget == nil else { return }
        loadingTarget = .google

        Task {
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
