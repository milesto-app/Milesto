import SwiftUI

struct TaskIntentionSheet: View {
    let task: WeeklyTaskDTO
    let existing: WeeklyTaskIntentionDTO?
    let onSaved: (WeeklyTaskIntentionDTO) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var dayOfWeek: Int
    @State private var localHour: Int
    @State private var locationLabel: String
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(
        task: WeeklyTaskDTO,
        existing: WeeklyTaskIntentionDTO?,
        onSaved: @escaping (WeeklyTaskIntentionDTO) -> Void
    ) {
        self.task = task
        self.existing = existing
        self.onSaved = onSaved
        _dayOfWeek = State(initialValue: existing?.dayOfWeek ?? 1)
        _localHour = State(initialValue: existing?.localHour ?? 19)
        _locationLabel = State(initialValue: existing?.locationLabel ?? "")
    }

    private var weekdaySymbols: [String] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.locale = Locale.current
        return calendar.standaloneWeekdaySymbols
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    AppText("roadmap.intention.subtitle", table: "Roadmap", style: .body)
                        .color(Color("TextSecondary"))
                }

                Section(String(localized: "roadmap.intention.day", table: "Roadmap")) {
                    Picker(selection: $dayOfWeek) {
                        ForEach(0 ..< 7, id: \.self) { index in
                            Text(weekdaySymbols[index].capitalized).tag(index)
                        }
                    } label: {
                        AppText("roadmap.intention.day", table: "Roadmap", style: .body)
                    }
                    .pickerStyle(.menu)
                }

                Section(String(localized: "roadmap.intention.hour", table: "Roadmap")) {
                    Picker(selection: $localHour) {
                        ForEach(0 ..< 24, id: \.self) { index in
                            Text("\(index):00").tag(index)
                        }
                    } label: {
                        AppText("roadmap.intention.hour", table: "Roadmap", style: .body)
                    }
                    .pickerStyle(.menu)
                }

                Section(String(localized: "roadmap.intention.location", table: "Roadmap")) {
                    AppTextField(
                        text: $locationLabel,
                        label: "roadmap.intention.locationPlaceholder",
                        table: "Roadmap"
                    )
                }

                if let errorMessage {
                    Section {
                        AppText(verbatim: errorMessage, style: .caption)
                            .color(Color("StatusError"))
                    }
                }
            }
            .navigationTitle(String(localized: "roadmap.intention.title", table: "Roadmap"))
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(String(localized: "common.cancel", table: "Common"), role: .cancel) {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(String(localized: "common.save", table: "Common")) {
                        Task { await save() }
                    }
                    .disabled(isSaving)
                }
            }
        }
    }

    private func save() async {
        errorMessage = nil
        isSaving = true
        defer { isSaving = false }
        do {
            let saved = try await IntentionsAPIService.shared.upsert(
                taskId: task.id,
                dayOfWeek: dayOfWeek,
                localHour: localHour,
                locationLabel: locationLabel
            )
            onSaved(saved)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
