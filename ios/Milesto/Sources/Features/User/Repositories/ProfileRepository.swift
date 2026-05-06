import Foundation

@MainActor
final class ProfileRepository {
    private let remote: ProfileRemote
    private let auth: AuthRepository

    init(auth: AuthRepository, remote: ProfileRemote? = nil) {
        self.remote = remote ?? ProfileRemote()
        self.auth = auth
    }

    func fetchProfile() async throws -> ProfileSnapshot {
        var fetchedProfile = try await remote.fetchProfile()
        fetchedProfile = await mergePendingAppleName(into: fetchedProfile)

        var fetchedEmail: String?
        var fetchedAvatarURL: String?
        if let authSnapshot = try? await remote.fetchAuthSnapshot() {
            fetchedEmail = authSnapshot.email
            fetchedAvatarURL = authSnapshot.avatarURL
        }

        return ProfileSnapshot(
            firstName: fetchedProfile?.firstName,
            lastName: fetchedProfile?.lastName,
            email: fetchedEmail,
            avatarURL: fetchedAvatarURL,
            coachId: fetchedProfile?.coachId,
            dateOfBirth: fetchedProfile?.dateOfBirth,
            createdAt: fetchedProfile?.createdAt
        )
    }

    func updateProfile(_ fields: ProfileUpdateFields) async throws -> ProfileSnapshot {
        let dto = try await remote.updateProfile(fields)
        let auth = try? await remote.fetchAuthSnapshot()
        return ProfileSnapshot(
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: auth?.email,
            avatarURL: auth?.avatarURL,
            coachId: dto.coachId,
            dateOfBirth: dto.dateOfBirth,
            createdAt: dto.createdAt
        )
    }

    private func mergePendingAppleName(into fetchedProfile: ProfileDTO?) async -> ProfileDTO? {
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
}
