import Foundation
import SwiftUI

@MainActor
@Observable
final class AuthViewModel {
    @ObservationIgnored @Environment(AppEnv.self) private var env

    private(set) var isAppleLoading = false
    private(set) var isGoogleLoading = false

    private(set) var errorMessage: String?
    var showErrorAlert = false

    func signInWithApple() async {
        isAppleLoading = true
        defer { isAppleLoading = false }
        do {
            _ = try await env.auth.signInWithApple()
        } catch AuthError.cancelled {
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
    }

    func signInWithGoogle() async {
        isGoogleLoading = true
        do {
            try await env.auth.signInWithGoogle()
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
