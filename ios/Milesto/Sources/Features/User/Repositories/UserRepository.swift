import Foundation

@MainActor
final class UserRepository {
    private let remote: UserRemote
    private let auth: AuthRepository

    init(auth: AuthRepository) {
        remote = UserRemote()
        self.auth = auth
    }

    func fetchUser() async throws -> UserDTO? {
        let fetched = try await remote.fetchUser()
        return await mergePendingAppleName(into: fetched)
    }

    func updateUser(_ fields: UserUpdateFieldsDTO) async throws -> UserDTO {
        try await remote.updateUser(fields)
    }

    private func mergePendingAppleName(into fetchedUser: UserDTO?) async -> UserDTO? {
        let pending = auth.consumePendingAppleName()
        guard pending.firstName != nil || pending.lastName != nil else { return fetchedUser }

        let existingFirst = fetchedUser?.firstName?.trimmingCharacters(in: .whitespaces) ?? ""
        let existingLast = fetchedUser?.lastName?.trimmingCharacters(in: .whitespaces) ?? ""
        guard existingFirst.isEmpty, existingLast.isEmpty else { return fetchedUser }

        do {
            return try await remote.updateUser(
                UserUpdateFieldsDTO(firstName: pending.firstName, lastName: pending.lastName)
            )
        } catch {
            return fetchedUser
        }
    }
}
