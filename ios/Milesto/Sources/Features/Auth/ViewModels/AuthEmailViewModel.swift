import Foundation
import SwiftUI

@MainActor
@Observable
final class AuthEmailViewModel {
    @ObservationIgnored @Environment(AppEnv.self) private var env

    private static let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"

    static func isValidEmail(_ email: String) -> Bool {
        let predicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return predicate.evaluate(with: email)
    }

    var email = ""
    var password = ""

    private(set) var isLoading = false

    private(set) var errorMessage: String?
    var showErrorAlert = false

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
}
