import Foundation

@MainActor
protocol AuthRepository: AuthSessionProviding {
    func signUp(email: String, password: String) async throws -> String
    func signIn(email: String, password: String) async throws -> String
    func signInWithApple() async throws -> String
    func signInWithGoogle() async throws
    func consumePendingAppleName() -> (firstName: String?, lastName: String?)
}
