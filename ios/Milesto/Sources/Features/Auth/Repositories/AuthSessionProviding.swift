import Foundation

@MainActor
protocol AuthSessionProviding: AnyObject {
    var currentUserId: String? { get }
    func signOut() async throws
}
