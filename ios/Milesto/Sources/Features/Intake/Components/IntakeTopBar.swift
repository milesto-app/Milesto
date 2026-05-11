import SwiftUI

struct IntakeTopBar: View {
    var canRestart: Bool = false
    var onStartOver: () async -> Void = {}

    @Environment(AppEnv.self) private var env
    @State private var showActions = false
    @State private var showSignOutError = false
    @State private var signOutErrorMessage = ""

    var body: some View {
        HStack {
            Spacer()

            Button {
                Haptics.warning()
                showActions = true
            } label: {
                TablerIcons(.x, size: 24, color: Color("TextPrimary"))
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
        }
        .padding(.top, 8)
        .padding(.horizontal, 16)
        .confirmationDialog(
            String(localized: "intake.topBar.actions.title", table: "Intake"),
            isPresented: $showActions,
            titleVisibility: .visible
        ) {
            if canRestart {
                Button(String(localized: "intake.startOver.action", table: "Intake"), role: .destructive) {
                    Task { await onStartOver() }
                }
            }
            Button(String(localized: "settings.signOut.alert.confirm", table: "Settings"), role: .destructive) {
                Task { await signOut() }
            }
            Button(String(localized: "common.cancel", table: "Common"), role: .cancel) {}
        }
        .alert(
            String(localized: "settings.error.title", table: "Settings"),
            isPresented: $showSignOutError
        ) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            AppText(verbatim: signOutErrorMessage, style: .body)
        }
    }

    private func signOut() async {
        do {
            try await env.auth.signOut()
        } catch {
            signOutErrorMessage = error.localizedDescription
            showSignOutError = true
        }
    }
}
