import SwiftUI

struct AppSignOutButton: View {
    let onConfirm: () async -> Void

    @State private var showConfirmation = false

    var body: some View {
        Button {
            showConfirmation = true
        } label: {
            TablerIcons(.logout, size: 20, color: Color("TextPrimary"))
                .frame(width: 44, height: 44)
                .glassEffect(.regular.interactive(), in: .circle)
        }
        .alert(
            String(localized: "common.signOut.alert.title", table: "Common"),
            isPresented: $showConfirmation
        ) {
            Button(String(localized: "common.cancel", table: "Common"), role: .cancel) {}
            Button(String(localized: "common.signOut.alert.confirm", table: "Common"), role: .destructive) {
                Task { await onConfirm() }
            }
        } message: {
            AppText("common.signOut.alert.message", table: "Common", style: .body)
        }
    }
}
