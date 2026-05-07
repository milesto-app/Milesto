import Foundation

@MainActor
@Observable
final class SettingsViewModel {
    @ObservationIgnored private let env: AppEnv

    private(set) var profile: ProfileDTO?
    private(set) var email: String?
    private(set) var avatarURL: String?
    private(set) var activeGoal: GoalDTO?
    private(set) var isDeleting = false
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    var showError = false

    init(env: AppEnv) {
        self.env = env
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

    func loadState() async {
        guard let userId = env.auth.currentUserId else { return }
        profile = try? await env.settings.fetchProfile()
        email = try? await AuthSession.userEmail()
        avatarURL = try? await AuthSession.userMetadataString("avatar_url")
        activeGoal = try? await env.settings.fetchActiveGoal(userId: userId)
    }

    func saveProfileFields(_ fields: ProfileUpdateFieldsDTO) async {
        isSaving = true
        defer { isSaving = false }
        do {
            try await env.settings.updateProfile(fields)
            await loadState()
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
            try await env.settings.deleteGoal(goalId: goal.id)
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
            try await env.auth.signOut()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}
