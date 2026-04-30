import Foundation
import Supabase
import SwiftData

@MainActor
final class SyncingProfileRepository: ProfileRepository {
    private let remote: SupabaseProfileRepository
    private let auth: any AuthRepository
    private let container: ModelContainer

    init(remote: SupabaseProfileRepository, auth: any AuthRepository, container: ModelContainer) {
        self.remote = remote
        self.auth = auth
        self.container = container
    }

    private var context: ModelContext { container.mainContext }

    func updateProfile(_ fields: ProfileUpdateFields) async throws -> Profile {
        try await remote.updateProfile(fields)
    }

    func sync(userId: String) async throws {
        var fetchedProfile = try await remote.fetchProfile(userId: userId)
        fetchedProfile = await mergePendingAppleName(into: fetchedProfile)

        var fetchedEmail: String?
        var fetchedAvatarURL: String?

        if let session = try? await Supabase.client.auth.session {
            fetchedEmail = session.user.email
            if case let .string(urlString) = session.user.userMetadata["avatar_url"] {
                fetchedAvatarURL = urlString
            }
        }

        let descriptor = FetchDescriptor<Profile>(
            predicate: #Predicate { $0.userId == userId }
        )
        let existing = (try? context.fetch(descriptor))?.first

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
            context.insert(Profile(
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
            ))
        }
        try? context.save()
    }

    private func mergePendingAppleName(into fetchedProfile: Profile?) async -> Profile? {
        let pending = auth.consumePendingAppleName()
        guard pending.firstName != nil || pending.lastName != nil else { return fetchedProfile }

        let existingFirst = fetchedProfile?.firstName?.trimmingCharacters(in: .whitespaces) ?? ""
        let existingLast = fetchedProfile?.lastName?.trimmingCharacters(in: .whitespaces) ?? ""
        guard existingFirst.isEmpty, existingLast.isEmpty else { return fetchedProfile }

        do {
            return try await remote.updateProfile(
                ProfileUpdateFields(firstName: pending.firstName, lastName: pending.lastName)
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
}
