import Foundation

@MainActor
@Observable
final class SettingsViewModel {
    @ObservationIgnored private let repository: SettingsRepository
    @ObservationIgnored private let auth: AuthRepository

    private(set) var profile: ProfileSnapshot?
    private(set) var activeGoal: GoalSnapshot?
    private(set) var isDeleting = false
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    var showError = false

    init(repository: SettingsRepository, auth: AuthRepository) {
        self.repository = repository
        self.auth = auth
    }

    var coach: CoachPersonality? {
        guard let coachId = profile?.coachId else { return nil }
        return CoachPersonality.from(databaseId: coachId)
    }

    var fullName: String {
        [profile?.firstName, profile?.lastName]
            .compactMap { $0 }
            .joined(separator: " ")
    }

    var initials: String {
        let first = profile?.firstName?.prefix(1) ?? ""
        let last = profile?.lastName?.prefix(1) ?? ""
        let result = "\(first)\(last)"
        return result.isEmpty ? "?" : result.uppercased()
    }

    var currentAppLanguage: String {
        let code = Bundle.main.preferredLocalizations.first ?? "en"
        let locale = Locale(identifier: code)
        return locale.localizedString(forLanguageCode: code)?.capitalized ?? code
    }

    func loadLocalState() {
        guard let userId = auth.currentUserId else { return }
        profile = repository.loadProfile(userId: userId)
        activeGoal = repository.loadActiveGoal(userId: userId)
    }

    func syncProfile() async {
        guard let userId = auth.currentUserId else { return }
        try? await repository.syncProfile(userId: userId)
        loadLocalState()
    }

    func saveProfileFields(_ fields: ProfileUpdateFields) async {
        isSaving = true
        defer { isSaving = false }
        do {
            try await repository.updateProfile(fields)
            loadLocalState()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    @discardableResult
    func deleteActiveGoal() async -> Bool {
        guard let goal = activeGoal else { return false }
        isDeleting = true
        defer { isDeleting = false }
        do {
            try await repository.deleteGoal(goalId: goal.id)
            activeGoal = nil
            return true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            return false
        }
    }

    func signOut() async {
        do {
            try await repository.purgeLocalUserData()
            try await auth.signOut()
        } catch SettingsRepositoryError.localPurgeFailed {
            errorMessage = String(localized: "settings.signOut.purge.error", table: "Settings")
            showError = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}
