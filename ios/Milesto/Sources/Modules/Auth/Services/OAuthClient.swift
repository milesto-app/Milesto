import AuthenticationServices
import CryptoKit
import Foundation

@MainActor
final class OAuthClient: NSObject {
    static let shared = OAuthClient()

    private(set) var pendingAppleFirstName: String?
    private(set) var pendingAppleLastName: String?

    func performAppleSignIn() async throws -> (identityToken: String, nonce: String) {
        let nonce = randomNonceString()
        let hashedNonce = sha256(nonce)

        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = hashedNonce

        let result: ASAuthorization
        do {
            result = try await performAppleRequest(request: request)
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

        return (identityToken, nonce)
    }

    func consumePendingAppleName() -> (firstName: String?, lastName: String?) {
        let name = (pendingAppleFirstName, pendingAppleLastName)
        pendingAppleFirstName = nil
        pendingAppleLastName = nil
        return name
    }

    func clearPendingAppleName() {
        pendingAppleFirstName = nil
        pendingAppleLastName = nil
    }

    private func performAppleRequest(request: ASAuthorizationAppleIDRequest) async throws -> ASAuthorization {
        try await withCheckedThrowingContinuation { continuation in
            let controller = ASAuthorizationController(authorizationRequests: [request])
            let delegate = AppleSignInDelegate(continuation: continuation)
            controller.delegate = delegate
            controller.presentationContextProvider = self
            objc_setAssociatedObject(controller, "delegate", delegate, .OBJC_ASSOCIATION_RETAIN)
            controller.performRequests()
        }
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

extension OAuthClient: ASAuthorizationControllerPresentationContextProviding {
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
