import SwiftData
import SwiftUI

struct SettingsView: View {
    var onNewGoal: ((String) -> Void)?
    var onDeleteGoal: (() -> Void)?

    @EnvironmentObject private var authService: AuthService
    @EnvironmentObject private var storeService: StoreService
    @StateObject private var usageService = UsageService.shared
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
    @State private var showPaywall = false

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
                proSection
                usageSection
                newGoalSection
                deleteGoalSection
                signOutSection
            }
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
                TablerIcons(icon, size: 24, color: Color("TintPrimary"))
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
            TablerIcons(icon, size: 24, color: Color("TintPrimary"))
            AppText(label, table: "Settings", style: .body)
            Spacer()
            AppText(verbatim: value, style: .body)
                .color(Color("TextSecondary"))
        }
    }

    private var proSection: some View {
        Section {
            if storeService.isPro {
                HStack(spacing: 12) {
                    TablerIcons(.crown, size: 24, color: Color("TintPrimary"))
                    AppText("settings.pro", table: "Paywall", style: .body)
                    Spacer()
                    HStack(spacing: 4) {
                        TablerIcons(.circleCheck, size: 16, color: Color("StatusSuccess"))
                        AppText("settings.pro.active", table: "Paywall", style: .caption)
                            .color(Color("StatusSuccess"))
                    }
                }
            } else {
                Button {
                    showPaywall = true
                } label: {
                    HStack(spacing: 12) {
                        TablerIcons(.crown, size: 24, color: Color("TintPrimary"))
                        AppText("settings.pro", table: "Paywall", style: .body)
                        Spacer()
                        TablerIcons(.chevronRight, size: 16, color: Color("TextSecondary"))
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var usageSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    TablerIcons(.bolt, size: 20, color: Color("TintPrimary"))
                    AppText("usage.daily.title", table: "Paywall", style: .body)
                    Spacer()
                    if let usage = usageService.usage {
                        AppText(verbatim: "\(usage.used) / \(usage.limit)", style: .caption)
                            .color(Color("TextSecondary"))
                    }
                }
                if let usage = usageService.usage {
                    ProgressView(value: Double(usage.used), total: Double(usage.limit))
                        .tint(usage.used >= usage.limit ? Color("StatusError") : Color("TintPrimary"))
                }
            }
        }
        .task {
            await usageService.fetchUsage()
        }
    }

    private var newGoalSection: some View {
        Section {
            Button {
                showNewGoal = true
            } label: {
                HStack(spacing: 12) {
                    TablerIcons(.target, size: 24, color: Color("TintPrimary"))
                    AppText("settings.newGoal", table: "Settings", style: .body)
                    Spacer()
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    private var deleteGoalSection: some View {
        Section {
            Button(role: .destructive) {
                showDeleteGoalAlert = true
            } label: {
                HStack(spacing: 12) {
                    TablerIcons(.trash, size: 24, color: Color("StatusError"))
                    AppText("settings.deleteGoal", table: "Settings", style: .body)
                        .color(Color("StatusError"))
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
                    TablerIcons(.logout, size: 24, color: Color("StatusError"))
                    AppText("settings.signOut", table: "Settings", style: .body)
                        .color(Color("StatusError"))
                }
                .contentShape(Rectangle())
            }
        } footer: {
            HStack {
                Spacer()
                AppText(verbatim: "Version 1.0.0", style: .caption)
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
