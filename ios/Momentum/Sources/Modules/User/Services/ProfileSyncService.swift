import Foundation
import Supabase
import SwiftData

@MainActor
final class ProfileSyncService {
    static let shared = ProfileSyncService()

    private init() {}

    private func mergePendingAppleName(into fetchedProfile: ProfileDTO?) async -> ProfileDTO? {
        let pending = AuthService.shared.consumePendingAppleName()
        guard pending.firstName != nil || pending.lastName != nil else { return fetchedProfile }

        let existingFirst = fetchedProfile?.firstName?.trimmingCharacters(in: .whitespaces) ?? ""
        let existingLast = fetchedProfile?.lastName?.trimmingCharacters(in: .whitespaces) ?? ""
        guard existingFirst.isEmpty, existingLast.isEmpty else { return fetchedProfile }

        do {
            return try await ProfileService.shared.updateProfile(
                ProfileUpdateFields(
                    firstName: pending.firstName,
                    lastName: pending.lastName
                )
            )
        } catch {
            return fetchedProfile
        }
    }

    private func downloadAvatarData(from urlString: String?) async -> Data? {
        guard let urlString, let url = URL(string: urlString) else { return nil }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            return data
        } catch {
            return nil
        }
    }

    func sync(userId: String, in modelContext: ModelContext) async throws {
        var fetchedProfile = try await ProfileService.shared.fetchProfile(userId: userId)
        fetchedProfile = await mergePendingAppleName(into: fetchedProfile)

        var fetchedEmail: String?
        var fetchedAvatarURL: String?

        if let session = try? await Supabase.client.auth.session {
            fetchedEmail = session.user.email
            if case let .string(urlString) = session.user.userMetadata["avatar_url"] {
                fetchedAvatarURL = urlString
            }
        }

        let descriptor = FetchDescriptor<LocalProfile>(
            predicate: #Predicate { $0.userId == userId }
        )
        let existing = (try? modelContext.fetch(descriptor))?.first

        let needsDownload = existing?.avatarURL != fetchedAvatarURL || existing?.avatarData == nil
        let avatarData: Data? = if needsDownload {
            await downloadAvatarData(from: fetchedAvatarURL)
        } else {
            existing?.avatarData
        }

        if let existing {
            existing.firstName = fetchedProfile?.firstName
            existing.lastName = fetchedProfile?.lastName
            existing.email = fetchedEmail
            existing.avatarURL = fetchedAvatarURL
            existing.avatarData = avatarData
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
                avatarData: avatarData,
                coachId: fetchedProfile?.coachId,
                dateOfBirth: fetchedProfile?.dateOfBirth,
                language: fetchedProfile?.language,
                createdAt: fetchedProfile?.createdAt
            )
            modelContext.insert(newProfile)
        }
    }
}
