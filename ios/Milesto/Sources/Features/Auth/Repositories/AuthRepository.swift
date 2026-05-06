import AuthenticationServices
import Foundation
import Supabase

@MainActor
@Observable
final class AuthRepository {
    private let client: Supabase.SupabaseClient
    private let oauth: OAuthClient

    private(set) var status: AuthState = .authenticating

    var currentUserId: String? {
        if case let .authenticated(userId) = status { return userId }
        return nil
    }

    init(client: Supabase.SupabaseClient? = nil, oauth: OAuthClient? = nil) {
        self.client = client ?? SupabaseClient.client
        self.oauth = oauth ?? OAuthClient()
        Task { await observeAuthState() }
    }

    func signUp(email: String, password: String) async throws -> String {
        try await authenticate {
            try await self.client.auth.signUp(email: email, password: password).user.id.uuidString
        }
    }

    func signIn(email: String, password: String) async throws -> String {
        try await authenticate {
            try await self.client.auth.signIn(email: email, password: password).user.id.uuidString
        }
    }

    func signInWithApple() async throws -> String {
        let credentials = try await oauth.performAppleSignIn()
        return try await authenticate {
            try await self.client.auth.signInWithIdToken(
                credentials: OpenIDConnectCredentials(
                    provider: .apple,
                    idToken: credentials.idToken,
                    nonce: credentials.nonce
                )
            ).user.id.uuidString
        }
    }

    func signInWithGoogle() async throws {
        do {
            try await client.auth.signInWithOAuth(
                provider: .google,
                redirectTo: URL(string: "milesto://auth-callback")
            )
        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            throw AuthError.cancelled
        } catch {
            status = .error(error.localizedDescription)
            throw AuthError(from: error)
        }
    }

    func signOut() async throws {
        try await client.auth.signOut()
        clearSession()
    }

    func consumePendingAppleName() -> (firstName: String?, lastName: String?) {
        oauth.consumePendingAppleName()
    }

    private func authenticate(_ obtainUserId: () async throws -> String) async throws -> String {
        status = .authenticating
        do {
            let userId = try await obtainUserId()
            status = .authenticated(userId: userId)
            return userId
        } catch {
            status = .error(error.localizedDescription)
            throw AuthError(from: error)
        }
    }

    private func clearSession() {
        status = .unauthenticated
        oauth.clearPendingAppleName()
    }

    private func observeAuthState() async {
        for await (event, session) in client.auth.authStateChanges {
            switch event {
            case .initialSession, .signedIn:
                if let userId = session?.user.id.uuidString {
                    status = .authenticated(userId: userId)
                    Task { await NotificationService.shared.requestPermissionAndRegister() }
                } else if event == .initialSession {
                    status = .unauthenticated
                }
            case .signedOut:
                clearSession()
            default:
                break
            }
        }
    }
}
