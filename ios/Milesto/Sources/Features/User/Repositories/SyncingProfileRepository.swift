import Foundation
import SwiftData

@MainActor
final class SyncingProfileRepository: ProfileRepository {
    private let remote: SupabaseProfileRepository
    private let auth: any AuthRepository
    private let container: ModelContainer

    init(
        remote: SupabaseProfileRepository,
        auth: any AuthRepository,
        container: ModelContainer
    ) {
        self.remote = remote
        self.auth = auth
        self.container = container
    }

    private var context: ModelContext {
        container.mainContext
    }

    func updateProfile(_ fields: ProfileUpdateFields) async throws -> ProfileSnapshot {
        let remote = try await remote.updateProfile(fields)
        let snapshot = mergeLocalSnapshot(with: remote)
        save(snapshot)
        return snapshot
    }

    func loadProfile(userId: String) -> ProfileSnapshot? {
        let descriptor = FetchDescriptor<LocalProfile>(
            predicate: #Predicate { $0.userId == userId }
        )
        return (try? context.fetch(descriptor))?.first?.snapshot
    }

    func sync(userId: String) async throws {
        var fetchedProfile = try await remote.fetchProfile(userId: userId)
        fetchedProfile = await mergePendingAppleName(into: fetchedProfile)

        var fetchedEmail: String?
        var fetchedAvatarURL: String?

        if let authSnapshot = try? await remote.fetchAuthSnapshot() {
            fetchedEmail = authSnapshot.email
            fetchedAvatarURL = authSnapshot.avatarURL
        }

        let descriptor = FetchDescriptor<LocalProfile>(
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
            existing.update(remote: fetchedProfile, email: fetchedEmail, avatarURL: fetchedAvatarURL, avatarData: avatarData)
        } else {
            context.insert(LocalProfile(remote: fetchedProfile, userId: userId, email: fetchedEmail, avatarURL: fetchedAvatarURL, avatarData: avatarData))
        }
        try? context.save()
    }

    private func mergePendingAppleName(into fetchedProfile: RemoteProfile?) async -> RemoteProfile? {
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
        return try? await URLSession.shared.data(from: url).0
    }

    private func mergeLocalSnapshot(with remote: RemoteProfile) -> ProfileSnapshot {
        let existing = loadProfile(userId: remote.userId)
        return ProfileSnapshot(
            userId: remote.userId,
            firstName: remote.firstName,
            lastName: remote.lastName,
            email: existing?.email,
            avatarData: existing?.avatarData,
            coachId: remote.coachId,
            dateOfBirth: remote.dateOfBirth,
            language: remote.language,
            createdAt: remote.createdAt
        )
    }

    private func save(_ snapshot: ProfileSnapshot) {
        let userId = snapshot.userId
        let descriptor = FetchDescriptor<LocalProfile>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let existing = try? context.fetch(descriptor).first {
            existing.apply(snapshot)
        } else {
            context.insert(LocalProfile(
                userId: snapshot.userId,
                firstName: snapshot.firstName,
                lastName: snapshot.lastName,
                email: snapshot.email,
                avatarData: snapshot.avatarData,
                coachId: snapshot.coachId,
                dateOfBirth: snapshot.dateOfBirth,
                language: snapshot.language,
                createdAt: snapshot.createdAt
            ))
        }
        try? context.save()
    }
}
