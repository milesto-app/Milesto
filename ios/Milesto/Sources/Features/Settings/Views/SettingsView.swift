import OSLog
import SwiftData
import SwiftUI

private let settingsLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto-ai", category: "Settings")

private enum LocalUserDataPurgeError: LocalizedError {
    case failed

    var errorDescription: String? {
        String(localized: "settings.signOut.purge.error", table: "Settings")
    }
}

struct SettingsView: View {
    var onNewGoal: ((String) -> Void)?
    var onDeleteGoal: (() -> Void)?

    @Environment(SupabaseAuthRepository.self) private var authService
    @Environment(\.modelContext) private var modelContext

    @Query private var localProfiles: [Profile]
    @Query private var localGoals: [Goal]

    @State private var showSignOutAlert = false
    @State private var showDeleteGoalAlert = false
    @State private var isDeleting = false
    @State private var showNewGoal = false
    @State private var activeSheet: SettingsSheet?
    @State private var isSaving = false
    @State private var showError = false
    @State private var errorMessage = ""
    #if DEBUG
        @State private var developerSettings = DeveloperSettings.shared
    #endif

    private var localProfile: Profile? {
        localProfiles.first { $0.userId == authService.currentUserId }
    }

    private var activeGoal: Goal? {
        localGoals.first { $0.userId.caseInsensitiveCompare(authService.currentUserId ?? "") == .orderedSame }
    }

    var body: some View {
        NavigationStack {
            List {
                SettingsProfileHeaderSection(
                    profile: localProfile,
                    fullName: fullName,
                    initials: initials,
                    onEdit: { activeSheet = .name }
                )
                SettingsProfileDetailsSection(
                    profile: localProfile,
                    coach: coach,
                    currentAppLanguage: currentAppLanguage,
                    onEditBirthdate: { activeSheet = .birthdate },
                    onEditCoach: { activeSheet = .coach },
                    onEditLanguage: { activeSheet = .language }
                )
                SettingsDeleteGoalSection(isDeleting: isDeleting) {
                    showDeleteGoalAlert = true
                }
                #if DEBUG
                    SettingsDeveloperSection(developerSettings: developerSettings)
                #endif
                SettingsSignOutSection {
                    showSignOutAlert = true
                }
            }
            .contentMargins(.bottom, 80, for: .scrollContent)
            .hapticRefreshable {
                await syncProfileData()
            }
            .navigationTitle("")
            .navigationBarHidden(true)
            .alert(String(localized: "settings.deleteGoal.alert.title", table: "Settings"), isPresented: $showDeleteGoalAlert) {
                Button(String(localized: "settings.signOut.alert.cancel", table: "Settings"), role: .cancel) {}
                Button(String(localized: "settings.deleteGoal.alert.confirm", table: "Settings"), role: .destructive) {
                    deleteGoal()
                }
            } message: {
                Text("settings.deleteGoal.alert.message", tableName: "Settings")
            }
            .alert(String(localized: "settings.signOut.alert.title", table: "Settings"), isPresented: $showSignOutAlert) {
                Button(String(localized: "settings.signOut.alert.cancel", table: "Settings"), role: .cancel) {}
                Button(String(localized: "settings.signOut.alert.confirm", table: "Settings"), role: .destructive) {
                    Task {
                        do {
                            try await purgeLocalUserData()
                            try await authService.signOut()
                        } catch {
                            settingsLogger.error("Sign-out aborted: local purge or auth sign-out failed")
                            errorMessage = error.localizedDescription
                            showError = true
                        }
                    }
                }
            } message: {
                Text("settings.signOut.alert.message", tableName: "Settings")
            }
            .alert(String(localized: "settings.error.title", table: "Settings"), isPresented: $showError) {
                Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
            } message: {
                Text(verbatim: errorMessage)
            }
            .sheet(item: $activeSheet) { sheet in
                SettingsSheetContent(sheet: sheet, profile: localProfile, onSave: saveFields)
                    .presentationDetents(sheet == .coach || sheet == .language ? [.large] : [.medium, .large])
            }
            .fullScreenCover(isPresented: $showNewGoal) {
                if let userId = authService.currentUserId {
                    GoalIntakeFlowView(
                        userId: userId,
                        existingGoalId: nil,
                        onClose: {
                            showNewGoal = false
                        },
                        onComplete: { goalId in
                            showNewGoal = false
                            onNewGoal?(goalId)
                        }
                    )
                }
            }
            .task {
                await syncProfileData()
            }
        }
    }

    private func deleteGoal() {
        guard let goal = activeGoal else { return }
        Task { @MainActor in
            isDeleting = true
            defer { isDeleting = false }
            do {
                try await SupabaseGoalRepository.shared.deleteGoal(goalId: goal.id)
                modelContext.delete(goal)
                onDeleteGoal?()
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }

    private func purgeLocalUserData() async throws {
        do {
            try await SubscriptionSyncOutbox.shared.purgeAll()
            try deleteAll(LocalChatMessage.self)
            try deleteAll(LocalConversation.self)
            try deleteAll(LocalDebrief.self)
            try deleteAll(LocalWeeklyTask.self)
            try deleteAll(LocalWeeklyPlan.self)
            try deleteAll(LocalMilestone.self)
            try deleteAll(LocalRoadmap.self)
            try deleteAll(LocalStats.self)
            try deleteAll(Goal.self)
            try deleteAll(Profile.self)
            try modelContext.save()
        } catch {
            settingsLogger.error("Failed to purge local user data before sign-out")
            throw LocalUserDataPurgeError.failed
        }
    }

    private func deleteAll<T: PersistentModel>(_: T.Type) throws {
        let descriptor = FetchDescriptor<T>()
        let rows = try modelContext.fetch(descriptor)
        for row in rows {
            modelContext.delete(row)
        }
    }

    private func saveFields(_ fields: ProfileUpdateFields) {
        Task { @MainActor in
            isSaving = true
            defer { isSaving = false }

            do {
                let updated = try await SupabaseProfileRepository.shared.updateProfile(fields)

                if let profile = localProfile {
                    if let v = updated.firstName { profile.firstName = v }
                    if let v = updated.lastName { profile.lastName = v }
                    if let v = updated.dateOfBirth { profile.dateOfBirth = v }
                    if let v = updated.coachId { profile.coachId = v }
                    if let v = updated.language { profile.language = v }
                }
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }

    private func syncProfileData() async {
        guard let userId = authService.currentUserId else { return }
        try? await SyncingProfileRepository.shared.sync(userId: userId, in: modelContext)
    }

    private var fullName: String {
        [localProfile?.firstName, localProfile?.lastName]
            .compactMap { $0 }
            .joined(separator: " ")
    }

    private var initials: String {
        let first = localProfile?.firstName?.prefix(1) ?? ""
        let last = localProfile?.lastName?.prefix(1) ?? ""
        let result = "\(first)\(last)"
        return result.isEmpty ? "?" : result.uppercased()
    }

    private var coach: CoachPersonality? {
        guard let coachId = localProfile?.coachId else { return nil }
        return CoachPersonality.from(databaseId: coachId)
    }

    private var currentAppLanguage: String {
        let code = Bundle.main.preferredLocalizations.first ?? "en"
        let locale = Locale(identifier: code)
        return locale.localizedString(forLanguageCode: code)?.capitalized ?? code
    }
}

#Preview {
    SettingsView()
        .environment(SupabaseAuthRepository.shared)
        .modelContainer(for: Profile.self, inMemory: true)
}
