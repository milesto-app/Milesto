import Foundation

@MainActor
final class ProfileRepository {
    private let remote: ProfileRemote
    private let auth: AuthRepository

    init(auth: AuthRepository) {
        remote = ProfileRemote()
        self.auth = auth
    }

    func fetchProfile() async throws -> ProfileDTO? {
        let fetched = try await remote.fetchProfile()
        return await mergePendingAppleName(into: fetched)
    }

    func updateProfile(_ fields: ProfileUpdateFieldsDTO) async throws -> ProfileDTO {
        try await remote.updateProfile(fields)
    }

    private func mergePendingAppleName(into fetchedProfile: ProfileDTO?) async -> ProfileDTO? {
        let pending = auth.consumePendingAppleName()
        guard pending.firstName != nil || pending.lastName != nil else { return fetchedProfile }

        let existingFirst = fetchedProfile?.firstName?.trimmingCharacters(in: .whitespaces) ?? ""
        let existingLast = fetchedProfile?.lastName?.trimmingCharacters(in: .whitespaces) ?? ""
        guard existingFirst.isEmpty, existingLast.isEmpty else { return fetchedProfile }

        do {
            return try await remote.updateProfile(
                ProfileUpdateFieldsDTO(firstName: pending.firstName, lastName: pending.lastName)
            )
        } catch {
            return fetchedProfile
        }
    }
}
