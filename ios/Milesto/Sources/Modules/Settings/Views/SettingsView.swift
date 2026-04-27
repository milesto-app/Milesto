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

    @EnvironmentObject private var authService: AuthService
    @Environment(\.modelContext) private var modelContext

    @Query private var localProfiles: [LocalProfile]
    @Query private var localGoals: [LocalGoal]

    @State private var showSignOutAlert = false
    @State private var showDeleteGoalAlert = false
    @State private var isDeleting = false
    @State private var showNewGoal = false
    @State private var activeSheet: SettingsSheet?
    @State private var isSaving = false
    @State private var showError = false
    @State private var errorMessage = ""
    private var localProfile: LocalProfile? {
        localProfiles.first { $0.userId == authService.currentUserId }
    }

    private var activeGoal: LocalGoal? {
        localGoals.first { $0.userId.caseInsensitiveCompare(authService.currentUserId ?? "") == .orderedSame }
    }

    var body: some View {
        NavigationStack {
            List {
                profileHeaderSection
                profileDetailsSection
                deleteGoalSection
                signOutSection
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
                sheetContent(for: sheet)
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

    @ViewBuilder
    private func sheetContent(for sheet: SettingsSheet) -> some View {
        switch sheet {
        case .name:
            EditNameSheet(
                firstName: localProfile?.firstName ?? "",
                lastName: localProfile?.lastName ?? ""
            ) { fields in
                saveFields(fields)
            }
        case .birthdate:
            EditBirthdateSheet(
                dateOfBirth: localProfile?.dateOfBirth ?? Date()
            ) { fields in
                saveFields(fields)
            }
        case .coach:
            EditCoachSheet(
                selectedCoach: localProfile?.coachId.flatMap { CoachPersonality.from(databaseId: $0) }
            ) { fields in
                saveFields(fields)
            }
        case .language:
            LanguageInfoSheet()
        }
    }

    private var profileHeaderSection: some View {
        Section {
            if localProfile == nil {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, 32)
                .listRowBackground(Color.clear)
            } else {
                Button {
                    activeSheet = .name
                } label: {
                    VStack(spacing: 16) {
                        ProfileAvatarView(
                            imageData: localProfile?.avatarData,
                            initials: initials,
                            size: 80
                        )

                        VStack(spacing: 4) {
                            if !fullName.isEmpty {
                                HStack(spacing: 6) {
                                    TablerIcons(.pencil, size: 16, color: .clear)
                                    AppText(verbatim: fullName, style: .title)
                                    TablerIcons(.pencil, size: 16, color: Color("TextSecondary"))
                                }
                            }

                            if let email = localProfile?.email, !email.isEmpty {
                                AppText(verbatim: email, style: .subheadline)
                                    .alignment(.center)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                }
                .buttonStyle(.plain)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }
        }
    }

    private var profileDetailsSection: some View {
        Section {
            if let dateOfBirth = localProfile?.dateOfBirth {
                editableRow(
                    icon: .cake,
                    label: "settings.profile.birthDate",
                    value: formattedDate(dateOfBirth)
                ) {
                    activeSheet = .birthdate
                }
            }

            if let coach {
                editableRow(
                    icon: coach.icon,
                    label: "settings.profile.coach",
                    value: coach.title
                ) {
                    activeSheet = .coach
                }
            }

            editableRow(
                icon: .world,
                label: "settings.profile.language",
                value: currentAppLanguage
            ) {
                activeSheet = .language
            }

            if let createdAt = localProfile?.createdAt {
                detailRow(
                    icon: .calendar,
                    label: "settings.profile.memberSince",
                    value: formattedDate(createdAt)
                )
            }
        }
    }

    private func editableRow(icon: TablerIconOutline, label: LocalizedStringKey, value: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                TablerIcons(icon, size: 24, color: Color("Brand"))
                AppText(label, table: "Settings", style: .body)
                Spacer()
                AppText(verbatim: value, style: .body)
                    .color(Color("TextSecondary"))
                TablerIcons(.chevronRight, size: 16, color: Color("TextSecondary"))
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func detailRow(icon: TablerIconOutline, label: LocalizedStringKey, value: String) -> some View {
        HStack(spacing: 12) {
            TablerIcons(icon, size: 24, color: Color("Brand"))
            AppText(label, table: "Settings", style: .body)
            Spacer()
            AppText(verbatim: value, style: .body)
                .color(Color("TextSecondary"))
        }
    }

    private var deleteGoalSection: some View {
        Section {
            Button(role: .destructive) {
                showDeleteGoalAlert = true
            } label: {
                HStack(spacing: 12) {
                    TablerIcons(.trash, size: 24, color: Color("Error"))
                    AppText("settings.deleteGoal", table: "Settings", style: .body)
                        .color(Color("Error"))
                }
                .contentShape(Rectangle())
            }
            .disabled(isDeleting)
        }
    }

    private var signOutSection: some View {
        Section {
            Button(role: .destructive) {
                showSignOutAlert = true
            } label: {
                HStack(spacing: 12) {
                    TablerIcons(.logout, size: 24, color: Color("Error"))
                    AppText("settings.signOut", table: "Settings", style: .body)
                        .color(Color("Error"))
                }
                .contentShape(Rectangle())
            }
        } footer: {
            HStack {
                Spacer()
                AppText(verbatim: "\(String(localized: "settings.version", table: "Settings")) \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "")", style: .caption)
                    .color(Color("TextSecondary"))
                Spacer()
            }
            .padding(.top, 24)
        }
    }

    private func deleteGoal() {
        guard let goal = activeGoal else { return }
        Task { @MainActor in
            isDeleting = true
            defer { isDeleting = false }
            do {
                try await GoalAPIService.shared.deleteGoal(goalId: goal.id)
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
            try deleteAll(LocalGoal.self)
            try deleteAll(LocalProfile.self)
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
                let updated = try await ProfileService.shared.updateProfile(fields)

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
        try? await ProfileSyncService.shared.sync(userId: userId, in: modelContext)
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

    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }

    private var currentAppLanguage: String {
        let code = Bundle.main.preferredLocalizations.first ?? "en"
        let locale = Locale(identifier: code)
        return locale.localizedString(forLanguageCode: code)?.capitalized ?? code
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthService.shared)
        .modelContainer(for: LocalProfile.self, inMemory: true)
}
