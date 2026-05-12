import SwiftUI

struct WeekCompleteCelebrationView: View {
    let isLastDayOfWeek: Bool
    let onDebrief: () -> Void
    let onUndo: () async -> Void

    @State private var isUndoing = false

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            TablerIcons(.confetti, size: 72, color: Color("Brand"))

            VStack(spacing: 12) {
                AppText("home.weekComplete.title", table: "Home", style: .largeTitle)
                    .multilineTextAlignment(.center)

                AppText(
                    isLastDayOfWeek
                        ? "home.weekComplete.subtitle.sunday"
                        : "home.weekComplete.subtitle",
                    table: "Home",
                    style: .body
                )
                .color(Color("TextSecondary"))
                .alignment(.center)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 24)
            }

            Spacer()

            VStack(spacing: 12) {
                AppButton("home.weekComplete.debrief", table: "Home", style: .primary) {
                    onDebrief()
                }
                .fullWidth()

                if !isLastDayOfWeek {
                    AppButton("home.weekComplete.undo", table: "Home", style: .ghost) {
                        guard !isUndoing else { return }
                        isUndoing = true
                        Task {
                            await onUndo()
                            isUndoing = false
                        }
                    }
                    .fullWidth()
                    .disabled(isUndoing)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color("BackgroundPrimary"))
    }
}
