import SwiftUI

struct OnboardingSignOutButton: View {
    @EnvironmentObject private var authService: AuthService
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
            String(localized: "settings.signOut.alert.title", table: "Settings"),
            isPresented: $showConfirmation
        ) {
            Button(String(localized: "settings.signOut.alert.cancel", table: "Settings"), role: .cancel) {}
            Button(String(localized: "settings.signOut.alert.confirm", table: "Settings"), role: .destructive) {
                Task { try? await authService.signOut() }
            }
        } message: {
            Text("settings.signOut.alert.message", tableName: "Settings")
        }
    }
}
