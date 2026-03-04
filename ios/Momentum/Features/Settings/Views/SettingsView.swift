import SwiftUI
import SwiftData

struct SettingsView: View {
    var onNewGoal: ((String) -> Void)?

    @EnvironmentObject private var authService: AuthService
    @EnvironmentObject private var storeService: StoreService
    @Environment(\.modelContext) private var modelContext

    @Query private var localProfiles: [LocalProfile]

    @State private var showSignOutAlert = false
    @State private var showNewGoal = false
    @State private var activeSheet: SettingsSheet?
    @State private var isSaving = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showPaywall = false

    private var localProfile: LocalProfile? {
        localProfiles.first { $0.userId == authService.currentUserId }
    }

    var body: some View {
        NavigationStack {
            List {
                profileHeaderSection
                profileDetailsSection
                proSection
                newGoalSection
                signOutSection
            }
            .refreshable {
                let impact = UIImpactFeedbackGenerator(style: .medium)
                impact.prepare()
                impact.impactOccurred()

                try? await Task.sleep(for: .milliseconds(800))
                await syncProfileData()

                let notification = UINotificationFeedbackGenerator()
                notification.notificationOccurred(.success)
            }
            .navigationTitle("")
            .navigationBarHidden(true)
            .alert(String(localized: "settings.signOut.alert.title", table: "Settings"), isPresented: $showSignOutAlert) {
                Button(String(localized: "settings.signOut.alert.cancel", table: "Settings"), role: .cancel) {}
                Button(String(localized: "settings.signOut.alert.confirm", table: "Settings"), role: .destructive) {
                    Task {
                        if let profile = localProfile {
                            modelContext.delete(profile)
                        }
                        try? await authService.signOut()
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
                    .presentationDetents(sheet == .coach ? [.large] : [.medium, .large])
            }
            .sheet(isPresented: $showPaywall) {
                PaywallView()
            }
            .fullScreenCover(isPresented: $showNewGoal) {
                if let userId = authService.currentUserId {
                    GoalIntakeFlowView(
                        userId: userId,
                        existingGoalId: nil,
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
            EditLanguageSheet(
                selectedLanguage: localProfile?.language ?? "en"
            ) { fields in
                saveFields(fields)
            }
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
                            url: localProfile?.avatarURL.flatMap { URL(string: $0) },
                            initials: initials,
                            size: 80
                        )

                        VStack(spacing: 4) {
                            if !fullName.isEmpty {
                                AppText(verbatim: fullName, style: .title)
                                    .alignment(.center)
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

            if let language = localProfile?.language, !language.isEmpty {
                editableRow(
                    icon: .world,
                    label: "settings.profile.language",
                    value: displayLanguage(language)
                ) {
                    activeSheet = .language
                }
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
                TablerIcon(icon, size: 24, color: AppTheme.Colors.accent)
                AppText(label, table: "Settings", style: .body)
                Spacer()
                AppText(verbatim: value, style: .body)
                    .color(AppTheme.Colors.textSecondary)
                TablerIcon(.chevronRight, size: 16, color: AppTheme.Colors.textSecondary)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func detailRow(icon: TablerIconOutline, label: LocalizedStringKey, value: String) -> some View {
        HStack(spacing: 12) {
            TablerIcon(icon, size: 24, color: AppTheme.Colors.accent)
            AppText(label, table: "Settings", style: .body)
            Spacer()
            AppText(verbatim: value, style: .body)
                .color(AppTheme.Colors.textSecondary)
        }
    }

    private var proSection: some View {
        Section {
            if storeService.isPro {
                HStack(spacing: 12) {
                    TablerIcon(.crown, size: 24, color: AppTheme.Colors.accent)
                    AppText("settings.pro", table: "Paywall", style: .body)
                        .weight(.semibold)
                    Spacer()
                    HStack(spacing: 4) {
                        TablerIcon(.circleCheck, size: 16, color: AppTheme.Colors.success)
                        AppText("settings.pro.active", table: "Paywall", style: .caption)
                            .color(AppTheme.Colors.success)
                            .weight(.semibold)
                    }
                }
            } else {
                Button {
                    showPaywall = true
                } label: {
                    HStack(spacing: 12) {
                        TablerIcon(.crown, size: 24, color: AppTheme.Colors.accent)
                        AppText("settings.pro", table: "Paywall", style: .body)
                            .weight(.semibold)
                        Spacer()
                        TablerIcon(.chevronRight, size: 16, color: AppTheme.Colors.textSecondary)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var newGoalSection: some View {
        Section {
            Button {
                showNewGoal = true
            } label: {
                HStack(spacing: 12) {
                    TablerIcon(.target, size: 24, color: AppTheme.Colors.accent)
                    AppText("settings.newGoal", table: "Settings", style: .body)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    private var signOutSection: some View {
        Section {
            Button(role: .destructive) {
                showSignOutAlert = true
            } label: {
                HStack(spacing: 12) {
                    TablerIcon(.logout, size: 24, color: AppTheme.Colors.error)
                    AppText("settings.signOut", table: "Settings", style: .body)
                        .color(AppTheme.Colors.error)
                }
                .contentShape(Rectangle())
            }
        } footer: {
            HStack {
                Spacer()
                AppText(verbatim: "Version 1.0.0", style: .caption)
                    .color(AppTheme.Colors.textSecondary)
                Spacer()
            }
            .padding(.top, 24)
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

    private func displayLanguage(_ code: String) -> String {
        Locale.current.localizedString(forLanguageCode: code)?.capitalized ?? code
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthService.shared)
        .environmentObject(StoreService.shared)
        .modelContainer(for: LocalProfile.self, inMemory: true)
}
