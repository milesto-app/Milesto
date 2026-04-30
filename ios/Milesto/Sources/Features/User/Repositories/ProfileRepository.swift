import Foundation
import SwiftData

@MainActor
protocol ProfileRepository: AnyObject {
    func updateProfile(_ fields: ProfileUpdateFields) async throws -> Profile
    func sync(userId: String, in modelContext: ModelContext) async throws
}
