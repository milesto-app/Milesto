import SwiftUI

struct IntakeStartOverButton: View {
    let onStartOver: () async -> Void

    @State private var showConfirm = false

    var body: some View {
        Button {
            showConfirm = true
        } label: {
            TablerIcons(.refresh, size: 24, color: Color("TextPrimary"))
                .frame(width: 44, height: 44)
                .glassEffect(.regular.interactive(), in: .circle)
        }
        .alert(
            String(localized: "intake.startOver.alert.title", table: "Intake"),
            isPresented: $showConfirm
        ) {
            Button(String(localized: "common.cancel", table: "Common"), role: .cancel) {}
            Button(String(localized: "intake.startOver.action", table: "Intake"), role: .destructive) {
                Task { await onStartOver() }
            }
        } message: {
            AppText("intake.startOver.alert.message", table: "Intake", style: .body)
        }
    }
}
