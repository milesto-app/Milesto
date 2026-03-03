import Foundation
import SwiftData
import Supabase

@MainActor
final class ProfileSyncService {
    static let shared = ProfileSyncService()

    private init() {}

    func sync(userId: String, in modelContext: ModelContext) async throws {
        let fetchedProfile = try await ProfileService.shared.fetchProfile(userId: userId)

        var fetchedEmail: String?
        var fetchedAvatarURL: String?

        if let session = try? await SupabaseConfig.client.auth.session {
            fetchedEmail = session.user.email
            if case .string(let urlString) = session.user.userMetadata["avatar_url"] {
                fetchedAvatarURL = urlString
            }
        }

        let descriptor = FetchDescriptor<LocalProfile>(
            predicate: #Predicate { $0.userId == userId }
        )
        let existing = (try? modelContext.fetch(descriptor))?.first

        if let existing {
            existing.firstName = fetchedProfile?.firstName
            existing.lastName = fetchedProfile?.lastName
            existing.email = fetchedEmail
            existing.avatarURL = fetchedAvatarURL
            existing.coachId = fetchedProfile?.coachId
            existing.dateOfBirth = fetchedProfile?.dateOfBirth
            existing.language = fetchedProfile?.language
            existing.createdAt = fetchedProfile?.createdAt
        } else {
            let newProfile = LocalProfile(
                userId: userId,
                firstName: fetchedProfile?.firstName,
                lastName: fetchedProfile?.lastName,
                email: fetchedEmail,
                avatarURL: fetchedAvatarURL,
                coachId: fetchedProfile?.coachId,
                dateOfBirth: fetchedProfile?.dateOfBirth,
                language: fetchedProfile?.language,
                createdAt: fetchedProfile?.createdAt
            )
            modelContext.insert(newProfile)
        }
    }
}
