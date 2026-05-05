import Foundation
import SwiftUI

@MainActor
@Observable
final class AuthViewModel {
    @ObservationIgnored @Environment(AppEnv.self) private var env

    var email = ""
    var password = ""
    private(set) var isLoading = false
    private(set) var isAppleLoading = false
    private(set) var isGoogleLoading = false
    private(set) var errorMessage: String?
    var showErrorAlert = false

    var authState: AuthState {
        env.auth.authState
    }

    func signUp() async {
        isLoading = true
        defer { isLoading = false }
        do {
            _ = try await env.auth.signUp(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
    }

    func signIn() async {
        isLoading = true
        defer { isLoading = false }
        do {
            _ = try await env.auth.signIn(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
            showErrorAlert = true
        }
    }

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
