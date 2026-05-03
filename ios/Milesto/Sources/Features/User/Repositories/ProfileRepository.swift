import Foundation

@MainActor
protocol ProfileRepository: AnyObject {
    func updateProfile(_ fields: ProfileUpdateFields) async throws -> ProfileSnapshot
    func sync(userId: String) async throws
    func loadProfile(userId: String) -> ProfileSnapshot?
}
