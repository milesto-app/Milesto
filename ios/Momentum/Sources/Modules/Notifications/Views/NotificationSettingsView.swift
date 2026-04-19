import SwiftData
import SwiftUI

enum NotificationKindRow: String, CaseIterable, Identifiable {
    case dailyCheckIn = "daily_check_in"
    case implementationIntention = "implementation_intention"
    case streakAtRisk = "streak_at_risk"
    case streakBroken = "streak_broken"
    case streakMilestone = "streak_milestone"
    case milestoneHit = "milestone_hit"
    case goalHit = "goal_hit"
    case weekCompleted = "week_completed"
    case milestonePreview = "milestone_preview"
    case planNotGenerated = "plan_not_generated"
    case weeklyDebriefPrompt = "weekly_debrief_prompt"
    case weekCompletionGap = "week_completion_gap"
    case staleTasks = "stale_tasks"
    case coachProactive = "coach_proactive"
    case winbackStep = "winback_step"

    var id: String {
        rawValue
    }

    var localizationKey: String {
        "notifications.settings.kind.\(rawValue)"
    }
}

struct NotificationSettingsView: View {
    @EnvironmentObject private var authService: AuthService
    @Environment(\.modelContext) private var modelContext
    @Query private var localProfiles: [LocalProfile]

    @State private var masterEnabled = true
    @State private var quietStartHour = 22
    @State private var quietEndHour = 7
    @State private var kindEnabled: [String: Bool] = [:]
    @State private var isSaving = false
    @State private var showError = false
    @State private var errorMessage = ""

    private var localProfile: LocalProfile? {
        localProfiles.first { $0.userId == authService.currentUserId }
    }

    var body: some View {
        List {
            masterSection
            quietHoursSection
            perKindSection
        }
        .navigationTitle(String(localized: "notifications.settings.title", table: "Notifications"))
        .alert(String(localized: "settings.error.title", table: "Settings"), isPresented: $showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            Text(verbatim: errorMessage)
        }
        .onAppear {
            loadInitialState()
        }
    }

    private var masterSection: some View {
        Section {
            Toggle(isOn: Binding(
                get: { masterEnabled },
                set: { newValue in
                    masterEnabled = newValue
                    patchColumn(fields: ProfileUpdateFields(notifEnabled: newValue))
                }
            )) {
                AppText("notifications.settings.master.toggle", table: "Notifications", style: .body)
            }
            .disabled(isSaving)
        } footer: {
            AppText("notifications.settings.master.footer", table: "Notifications", style: .caption)
                .color(Color("TextSecondary"))
        }
    }

    private var quietHoursSection: some View {
        Section {
            hourPickerRow(
                label: "notifications.settings.quiet.start",
                value: $quietStartHour
            ) { newValue in
                quietStartHour = newValue
                patchColumn(fields: ProfileUpdateFields(notifQuietStart: newValue))
            }
            hourPickerRow(
                label: "notifications.settings.quiet.end",
                value: $quietEndHour
            ) { newValue in
                quietEndHour = newValue
                patchColumn(fields: ProfileUpdateFields(notifQuietEnd: newValue))
            }
        } header: {
            AppText("notifications.settings.quiet.header", table: "Notifications", style: .caption)
        } footer: {
            AppText("notifications.settings.quiet.footer", table: "Notifications", style: .caption)
                .color(Color("TextSecondary"))
        }
    }

    private var perKindSection: some View {
        Section {
            ForEach(NotificationKindRow.allCases) { row in
                Toggle(isOn: Binding(
                    get: { kindEnabled[row.rawValue] ?? true },
                    set: { newValue in
                        kindEnabled[row.rawValue] = newValue
                        updateKindEnabled(kind: row.rawValue, enabled: newValue)
                    }
                )) {
                    AppText(LocalizedStringKey(row.localizationKey), table: "Notifications", style: .body)
                }
                .disabled(!masterEnabled || isSaving)
            }
        } header: {
            AppText("notifications.settings.kinds.header", table: "Notifications", style: .caption)
        }
    }

    private func hourPickerRow(
        label: LocalizedStringKey,
        value: Binding<Int>,
        onCommit: @escaping (Int) -> Void
    ) -> some View {
        HStack {
            AppText(label, table: "Notifications", style: .body)
            Spacer()
            Picker("", selection: value) {
                ForEach(0 ..< 24, id: \.self) { hour in
                    Text(verbatim: formattedHour(hour)).tag(hour)
                }
            }
            .pickerStyle(.menu)
            .onChange(of: value.wrappedValue) { _, newValue in
                onCommit(newValue)
            }
        }
    }

    private func formattedHour(_ hour: Int) -> String {
        String(format: "%02d:00", hour)
    }

    private func loadInitialState() {
        guard let profile = localProfile else { return }
        masterEnabled = profile.notifEnabled ?? true
        quietStartHour = profile.notifQuietStart ?? 22
        quietEndHour = profile.notifQuietEnd ?? 7
        if let json = profile.notifPreferencesJSON,
           let data = json.data(using: .utf8),
           let prefs = try? JSONDecoder().decode(NotifPreferences.self, from: data)
        {
            var map: [String: Bool] = [:]
            for (kind, pref) in prefs.kinds {
                map[kind] = pref.enabled ?? true
            }
            kindEnabled = map
        }
    }

    private func patchColumn(fields: ProfileUpdateFields) {
        Task { @MainActor in
            isSaving = true
            defer { isSaving = false }
            do {
                let updated = try await ProfileService.shared.updateProfile(fields)
                if let profile = localProfile {
                    if let v = updated.notifEnabled { profile.notifEnabled = v }
                    if let v = updated.notifQuietStart { profile.notifQuietStart = v }
                    if let v = updated.notifQuietEnd { profile.notifQuietEnd = v }
                }
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }

    private func updateKindEnabled(kind: String, enabled: Bool) {
        Task { @MainActor in
            isSaving = true
            defer { isSaving = false }
            do {
                let prefs = try await ProfileService.shared.setKindEnabled(kind: kind, enabled: enabled)
                if let profile = localProfile,
                   let data = try? JSONEncoder().encode(prefs),
                   let str = String(data: data, encoding: .utf8)
                {
                    profile.notifPreferencesJSON = str
                }
            } catch {
                errorMessage = error.localizedDescription
                showError = true
                kindEnabled[kind] = !enabled
            }
        }
    }
}

#Preview {
    NavigationStack {
        NotificationSettingsView()
            .environmentObject(AuthService.shared)
            .modelContainer(for: LocalProfile.self, inMemory: true)
    }
}
