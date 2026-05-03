import Foundation

@MainActor
protocol AuthSessionProviding: AnyObject {
    var authState: AuthState { get }
    var currentUserId: String? { get }
    func signOut() async throws
}
