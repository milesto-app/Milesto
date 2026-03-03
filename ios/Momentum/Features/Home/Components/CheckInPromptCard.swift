import SwiftUI

struct CheckInPromptCard: View {
    let firstName: String
    let goalId: String
    let onCheckInComplete: () -> Void

    @State private var selectedEnergy: EnergyLevel?
    @State private var note: String = ""
    @State private var isSubmitting = false
    @State private var showNote = false
    @State private var error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            TablerIcon(.sunrise, size: 28, color: AppTheme.Colors.accent)

            AppText(
                verbatim: String(
                    format: String(localized: "home.checkin.greeting", table: "Home"),
                    firstName
                ),
                style: .headline
            )

            AppText("home.checkin.question", table: "Home", style: .subheadline)
                .color(AppTheme.Colors.textSecondary)

            HStack(spacing: 12) {
                energyButton(.high, icon: .bolt, label: String(localized: "home.checkin.energy.high", table: "Home"))
                energyButton(.good, icon: .sunHigh, label: String(localized: "home.checkin.energy.good", table: "Home"))
                energyButton(.low, icon: .battery1, label: String(localized: "home.checkin.energy.low", table: "Home"))
                energyButton(.veryLow, icon: .batteryOff, label: String(localized: "home.checkin.energy.veryLow", table: "Home"))
            }

            if showNote {
                HStack(alignment: .bottom, spacing: 12) {
                    AppTextField(
                        text: $note,
                        placeholder: "home.checkin.note.placeholder",
                        table: "Home"
                    )

                    VoiceToggleButton(transcribedText: $note, coachId: nil)
                }
                .transition(.move(edge: .top).combined(with: .opacity))
            }

            if let error {
                AppText(verbatim: error, style: .caption)
                    .color(AppTheme.Colors.error)
            }

            AppButton("home.checkin.submit", table: "Home", style: .primary) {
                Task { await submit() }
            }
            .fullWidth()
            .disabled(selectedEnergy == nil || isSubmitting)
        }
        .padding(24)
        .glassEffect(.clear.interactive(), in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.xl))
    }

    private func energyButton(_ level: EnergyLevel, icon: TablerIconOutline, label: String) -> some View {
        let isSelected = selectedEnergy == level
        return Button {
            withAnimation(.easeOut(duration: 0.2)) {
                selectedEnergy = level
                showNote = true
            }
            UISelectionFeedbackGenerator().selectionChanged()
        } label: {
            VStack(spacing: 4) {
                TablerIcon(icon, size: 24, color: isSelected ? AppTheme.Colors.accent : AppTheme.Colors.iconDefault)
                AppText(verbatim: label, style: .caption)
                    .color(isSelected ? AppTheme.Colors.accent : AppTheme.Colors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                    .fill(isSelected ? AppTheme.Colors.accent.opacity(0.15) : Color.clear)
            )
            .overlay(
                RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                    .stroke(isSelected ? AppTheme.Colors.accent : Color.clear, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
    }

    private func submit() async {
        guard let energy = selectedEnergy else { return }
        isSubmitting = true
        error = nil
        do {
            _ = try await RoadmapAPIService.shared.submitCheckIn(
                goalId: goalId,
                energyLevel: energy,
                note: note.isEmpty ? nil : note
            )
            onCheckInComplete()
        } catch {
            self.error = error.localizedDescription
        }
        isSubmitting = false
    }
}
