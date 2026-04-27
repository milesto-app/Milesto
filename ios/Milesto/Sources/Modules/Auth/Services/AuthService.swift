import AuthenticationServices
import Combine
import CryptoKit
import Foundation
import Supabase

@MainActor
final class AuthService: NSObject, ObservableObject {
    static let shared = AuthService()

    private var client: SupabaseClient {
        Supabase.client
    }

    @Published private(set) var authState: AuthState = .authenticating
    @Published private(set) var currentUserId: String?

    private var currentNonce: String?
    private var pendingAppleFirstName: String?
    private var pendingAppleLastName: String?

    override private init() {
        super.init()

        Task {
            await setupAuthStateListener()
        }
    }

    private func setupAuthStateListener() async {
        for await(event, session) in client.auth.authStateChanges {
            switch event {
            case .initialSession:
                if let session {
                    authState = .authenticated(userId: session.user.id.uuidString)
                    currentUserId = session.user.id.uuidString
                    persistSession(session)
                } else {
                    authState = .unauthenticated
                    currentUserId = nil
                }
            case .signedIn:
                if let session {
                    authState = .authenticated(userId: session.user.id.uuidString)
                    currentUserId = session.user.id.uuidString
                    persistSession(session)
                }
            case .signedOut:
                authState = .unauthenticated
                currentUserId = nil
                pendingAppleFirstName = nil
                pendingAppleLastName = nil
                SharedKeychain.clearAll()
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
        SharedKeychain.setSupabaseAccessToken(session.accessToken, expiresAt: expiresAt)
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
        let nonce = randomNonceString()
        currentNonce = nonce
        let hashedNonce = sha256(nonce)

        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = hashedNonce

        let result: ASAuthorization
        do {
            result = try await performAppleSignIn(request: request)
        } catch let error as ASAuthorizationError where error.code == .canceled {
            throw AuthError.cancelled
        }

        guard let appleIDCredential = result.credential as? ASAuthorizationAppleIDCredential,
              let identityTokenData = appleIDCredential.identityToken,
              let identityToken = String(data: identityTokenData, encoding: .utf8)
        else {
            throw AuthError.unknown("Failed to get Apple ID token")
        }

        let givenName = appleIDCredential.fullName?.givenName?.trimmingCharacters(in: .whitespaces)
        let familyName = appleIDCredential.fullName?.familyName?.trimmingCharacters(in: .whitespaces)
        pendingAppleFirstName = (givenName?.isEmpty == false) ? givenName : nil
        pendingAppleLastName = (familyName?.isEmpty == false) ? familyName : nil

        do {
            let session = try await client.auth.signInWithIdToken(
                credentials: OpenIDConnectCredentials(
                    provider: .apple,
                    idToken: identityToken,
                    nonce: nonce
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

    private func performAppleSignIn(request: ASAuthorizationAppleIDRequest) async throws -> ASAuthorization {
        try await withCheckedThrowingContinuation { continuation in
            let controller = ASAuthorizationController(authorizationRequests: [request])
            let delegate = AppleSignInDelegate(continuation: continuation)
            controller.delegate = delegate
            controller.presentationContextProvider = self
            objc_setAssociatedObject(controller, "delegate", delegate, .OBJC_ASSOCIATION_RETAIN)
            controller.performRequests()
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
        pendingAppleFirstName = nil
        pendingAppleLastName = nil
    }

    func consumePendingAppleName() -> (firstName: String?, lastName: String?) {
        let name = (pendingAppleFirstName, pendingAppleLastName)
        pendingAppleFirstName = nil
        pendingAppleLastName = nil
        return name
    }

    func handleDeepLink(_ url: URL) async {
        do {
            let session = try await client.auth.session(from: url)
            authState = .authenticated(userId: session.user.id.uuidString)
            currentUserId = session.user.id.uuidString
        } catch {
            authState = .error(error.localizedDescription)
        }
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

    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
        }
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        let nonce = randomBytes.map { byte in
            charset[Int(byte) % charset.count]
        }
        return String(nonce)
    }

    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        return hashedData.compactMap { String(format: "%02x", $0) }.joined()
    }
}

extension AuthService: ASAuthorizationControllerPresentationContextProviding {
    nonisolated func presentationAnchor(for _: ASAuthorizationController) -> ASPresentationAnchor {
        DispatchQueue.main.sync {
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let window = scene.windows.first
            else {
                fatalError("No window found")
            }
            return window
        }
    }
}

private class AppleSignInDelegate: NSObject, ASAuthorizationControllerDelegate {
    private let continuation: CheckedContinuation<ASAuthorization, Error>

    init(continuation: CheckedContinuation<ASAuthorization, Error>) {
        self.continuation = continuation
    }

    func authorizationController(controller _: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        continuation.resume(returning: authorization)
    }

    func authorizationController(controller _: ASAuthorizationController, didCompleteWithError error: Error) {
        continuation.resume(throwing: error)
    }
}
