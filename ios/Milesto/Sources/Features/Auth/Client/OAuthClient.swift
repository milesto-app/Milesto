import AuthenticationServices
import CryptoKit
import Foundation

@MainActor
final class OAuthClient: NSObject {
    struct AppleCredentials {
        let idToken: String
        let nonce: String
    }

    private(set) var pendingAppleName: (first: String?, last: String?)?
    private var continuation: CheckedContinuation<ASAuthorization, Error>?

    func performAppleSignIn() async throws -> AppleCredentials {
        let nonce = try Self.randomNonce()
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = Self.sha256(nonce)

        let authorization: ASAuthorization
        do {
            authorization = try await withCheckedThrowingContinuation { cont in
                self.continuation = cont
                let controller = ASAuthorizationController(authorizationRequests: [request])
                controller.delegate = self
                controller.presentationContextProvider = self
                controller.performRequests()
            }
        } catch let error as ASAuthorizationError where error.code == .canceled || error.code == .unknown {
            throw AuthError.cancelled
        }

        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let idToken = String(data: tokenData, encoding: .utf8)
        else { throw AuthError.unknown("Failed to get Apple ID token") }

        pendingAppleName = (
            credential.fullName?.givenName?.trimmedNonEmpty,
            credential.fullName?.familyName?.trimmedNonEmpty
        )
        return AppleCredentials(idToken: idToken, nonce: nonce)
    }

    func consumePendingAppleName() -> (firstName: String?, lastName: String?) {
        defer { pendingAppleName = nil }
        return (firstName: pendingAppleName?.first, lastName: pendingAppleName?.last)
    }

    func clearPendingAppleName() {
        pendingAppleName = nil
    }

    private static func randomNonce(length: Int = 32) throws -> String {
        var bytes = [UInt8](repeating: 0, count: length)
        guard SecRandomCopyBytes(kSecRandomDefault, length, &bytes) == errSecSuccess
        else { throw AuthError.unknown("Unable to generate nonce") }
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(bytes.map { charset[Int($0) % charset.count] })
    }

    private static func sha256(_ input: String) -> String {
        SHA256.hash(data: Data(input.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

extension OAuthClient: ASAuthorizationControllerDelegate {
    nonisolated func authorizationController(
        controller _: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        Task { @MainActor in
            self.continuation?.resume(returning: authorization)
            self.continuation = nil
        }
    }

    nonisolated func authorizationController(
        controller _: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        Task { @MainActor in
            self.continuation?.resume(throwing: error)
            self.continuation = nil
        }
    }
}

extension OAuthClient: ASAuthorizationControllerPresentationContextProviding {
    nonisolated func presentationAnchor(for _: ASAuthorizationController) -> ASPresentationAnchor {
        MainActor.assumeIsolated {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            guard let scene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
            else { preconditionFailure("ASAuthorizationController requires an active UIWindowScene") }
            return scene.windows.first(where: \.isKeyWindow)
                ?? scene.windows.first
                ?? UIWindow(windowScene: scene)
        }
    }
}

private extension String {
    var trimmedNonEmpty: String? {
        let trimmed = trimmingCharacters(in: .whitespaces)
        return trimmed.isEmpty ? nil : trimmed
    }
}
