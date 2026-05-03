import Foundation

@MainActor
protocol OnboardingRepository: AnyObject {
    func saveProfile(userId: String, fields: ProfileUpdateFields, dateOfBirth: Date) async throws
}
