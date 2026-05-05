import AuthenticationServices
import Foundation
import Supabase

@MainActor
@Observable
final class SupabaseAuthRepository: AuthRepository {
    private let client: SupabaseClient
    private let oauth: OAuthClient

    private(set) var authState: AuthState = .authenticating
    private(set) var currentUserId: String?

    init(client: SupabaseClient? = nil, oauth: OAuthClient? = nil) {
        self.client = client ?? SupabaseConfig.client
        self.oauth = oauth ?? OAuthClient()
        Task {
            await setupAuthStateListener()
        }
    }

    private func setupAuthStateListener() async {
        for await (event, session) in client.auth.authStateChanges {
            switch event {
            case .initialSession:
                if let session {
                    authState = .authenticated(userId: session.user.id.uuidString)
                    currentUserId = session.user.id.uuidString
                    persistSession(session)
                    Task { await NotificationService.shared.requestPermissionAndRegister() }
                } else {
                    authState = .unauthenticated
                    currentUserId = nil
                }
            case .signedIn:
                if let session {
                    authState = .authenticated(userId: session.user.id.uuidString)
                    currentUserId = session.user.id.uuidString
                    persistSession(session)
                    Task { await NotificationService.shared.requestPermissionAndRegister() }
                }
            case .signedOut:
                authState = .unauthenticated
                currentUserId = nil
                oauth.clearPendingAppleName()
                Keychain.clearAll()
            case .tokenRefreshed:
                if let session {
                    currentUserId = session.user.id.uuidString
                    persistSession(session)
                }
            default:
                break
            }
        }
    }

    private func persistSession(_ session: Session) {
        let expiresAt = Date(timeIntervalSince1970: session.expiresAt)
        Keychain.setSupabaseAccessToken(session.accessToken, expiresAt: expiresAt)
    }

    func signUp(email: String, password: String) async throws -> String {
        authState = .authenticating
        do {
            let response = try await client.auth.signUp(
                email: email,
                password: password
            )
            let userId = response.user.id.uuidString
            authState = .authenticated(userId: userId)
            currentUserId = userId
            return userId
        } catch {
            authState = .error(error.localizedDescription)
            throw mapAuthError(error)
        }
    }

    func signIn(email: String, password: String) async throws -> String {
        authState = .authenticating
        do {
            let session = try await client.auth.signIn(
                email: email,
                password: password
            )
            let userId = session.user.id.uuidString
            authState = .authenticated(userId: userId)
            currentUserId = userId
            return userId
        } catch {
            authState = .error(error.localizedDescription)
            throw mapAuthError(error)
        }
    }

    func signInWithApple() async throws -> String {
        let credentials = try await oauth.performAppleSignIn()

        do {
            let session = try await client.auth.signInWithIdToken(
                credentials: OpenIDConnectCredentials(
                    provider: .apple,
                    idToken: credentials.identityToken,
                    nonce: credentials.nonce
                )
            )
            let userId = session.user.id.uuidString
            authState = .authenticated(userId: userId)
            currentUserId = userId
            return userId
        } catch {
            authState = .error(error.localizedDescription)
            throw mapAuthError(error)
        }
    }

    func signInWithGoogle() async throws {
        do {
            try await client.auth.signInWithOAuth(
                provider: .google,
                redirectTo: URL(string: "milesto://auth-callback")
            )
        } catch {
            authState = .error(error.localizedDescription)
            throw mapAuthError(error)
        }
    }

    func signOut() async throws {
        await NotificationService.shared.unregisterCurrentToken()
        try await client.auth.signOut()
        authState = .unauthenticated
        currentUserId = nil
        oauth.clearPendingAppleName()
    }

    func consumePendingAppleName() -> (firstName: String?, lastName: String?) {
        oauth.consumePendingAppleName()
    }

    private func mapAuthError(_ error: Error) -> AuthError {
        let errorString = error.localizedDescription.lowercased()
        if errorString.contains("invalid") || errorString.contains("credentials") {
            return .invalidCredentials
        } else if errorString.contains("already") || errorString.contains("exists") || errorString.contains("registered") {
            return .emailAlreadyInUse
        } else if errorString.contains("weak") || errorString.contains("password") {
            return .weakPassword
        } else if errorString.contains("network") || errorString.contains("connection") {
            return .networkError
        }
        return .unknown(error.localizedDescription)
    }
}
