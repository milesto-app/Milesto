import Foundation

@MainActor
protocol ProfileRepository: AnyObject {
    func updateProfile(_ fields: ProfileUpdateFields) async throws -> Profile
    func sync(userId: String) async throws
    func loadProfile(userId: String) -> Profile?
}
