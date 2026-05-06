import SwiftUI

struct SettingsView: View {
    var onDeleteGoal: (() -> Void)?

    @Environment(AppEnv.self) private var env
    @State private var model: SettingsViewModel?
    @State private var showSignOutAlert = false
    @State private var showDeleteGoalAlert = false
    @State private var activeSheet: SettingsSheet?

    var body: some View {
        Group {
            if let model {
                content(model: model)
            } else {
                Color("BackgroundBase").ignoresSafeArea()
            }
        }
        .task {
            if model == nil {
                model = SettingsViewModel(
                    repository: env.settings,
                    auth: env.auth
                )
            }
            await model?.loadState()
        }
    }

    @ViewBuilder
    private func content(model: SettingsViewModel) -> some View {
        @Bindable var bindable = model
        NavigationStack {
            List {
                SettingsProfileHeaderSection(
                    profile: model.profile,
                    email: model.email,
                    avatarURL: model.avatarURL,
                    fullName: model.fullName,
                    initials: model.initials,
                    onEdit: { activeSheet = .name }
                )
                SettingsProfileDetailsSection(
                    profile: model.profile,
                    coach: model.coach,
                    currentAppLanguage: model.currentAppLanguage,
                    onEditBirthdate: { activeSheet = .birthdate },
                    onEditCoach: { activeSheet = .coach },
                    onEditLanguage: { activeSheet = .language }
                )
                SettingsDangerSection(
                    isDeleting: model.isDeleting,
                    onDeleteGoal: { showDeleteGoalAlert = true },
                    onSignOut: { showSignOutAlert = true }
                )
            }
            .appScrollBackground()
            .background(Color("BackgroundBase"))
            .contentMargins(.bottom, 80, for: .scrollContent)
            .navigationTitle("")
            .navigationBarHidden(true)
            .alert(String(localized: "settings.deleteGoal.alert.title", table: "Settings"), isPresented: $showDeleteGoalAlert) {
                Button(String(localized: "settings.signOut.alert.cancel", table: "Settings"), role: .cancel) {}
                Button(String(localized: "settings.deleteGoal.alert.confirm", table: "Settings"), role: .destructive) {
                    Task {
                        if await model.deleteActiveGoal() {
                            onDeleteGoal?()
                        }
                    }
                }
            } message: {
                AppText("settings.deleteGoal.alert.message", table: "Settings", style: .body)
            }
            .alert(String(localized: "settings.signOut.alert.title", table: "Settings"), isPresented: $showSignOutAlert) {
                Button(String(localized: "settings.signOut.alert.cancel", table: "Settings"), role: .cancel) {}
                Button(String(localized: "settings.signOut.alert.confirm", table: "Settings"), role: .destructive) {
                    Task { await model.signOut() }
                }
            } message: {
                AppText("settings.signOut.alert.message", table: "Settings", style: .body)
            }
            .alert(String(localized: "settings.error.title", table: "Settings"), isPresented: $bindable.showError) {
                Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
            } message: {
                AppText(verbatim: model.errorMessage ?? "", style: .body)
            }
            .sheet(item: $activeSheet) { sheet in
                SettingsSheetContent(sheet: sheet, profile: model.profile) { fields in
                    Task { await model.saveProfileFields(fields) }
                }
                .appPresentationBackground()
                .presentationDetents(sheet == .coach || sheet == .language ? [.large] : [.medium, .large])
            }
        }
        .appBackground()
    }
}
