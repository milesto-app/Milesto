import SwiftUI

struct SignOutGlassButton: View {
    @Environment(AppEnv.self) private var env
    @State private var showConfirm = false
    @State private var showError = false
    @State private var errorMessage = ""

    var body: some View {
        Button {
            showConfirm = true
        } label: {
            TablerIcons(.logout, size: 24, color: Color("TextPrimary"))
                .frame(width: 44, height: 44)
                .glassEffect(.regular.interactive(), in: .circle)
        }
        .alert(
            String(localized: "settings.signOut.alert.title", table: "Settings"),
            isPresented: $showConfirm
        ) {
            Button(String(localized: "settings.signOut.alert.cancel", table: "Settings"), role: .cancel) {}
            Button(String(localized: "settings.signOut.alert.confirm", table: "Settings"), role: .destructive) {
                Task { await signOut() }
            }
        } message: {
            AppText("settings.signOut.alert.message", table: "Settings", style: .body)
        }
        .alert(
            String(localized: "settings.error.title", table: "Settings"),
            isPresented: $showError
        ) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            AppText(verbatim: errorMessage, style: .body)
        }
    }

    private func signOut() async {
        do {
            try await env.auth.signOut()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}
