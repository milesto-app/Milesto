import SwiftUI

struct NotificationPermissionExplainerSheet: View {
    @EnvironmentObject private var coordinator: PermissionPromptCoordinator

    var body: some View {
        VStack(spacing: 24) {
            TablerIcons(.bell, size: 56, color: Color("TintPrimary"))
                .padding(.top, 32)

            VStack(spacing: 12) {
                AppText("notifications.permission.title", table: "Notifications", style: .title)
                    .alignment(.center)

                AppText("notifications.permission.body", table: "Notifications", style: .body)
                    .color(.secondary)
                    .alignment(.center)
            }
            .padding(.horizontal, 24)

            Spacer()

            VStack(spacing: 12) {
                AppButton("notifications.permission.enable", table: "Notifications") {
                    Task { await coordinator.handleEnableTapped() }
                }
                .fullWidth()
                .disabled(coordinator.isSubmitting)

                AppButton("notifications.permission.notNow", table: "Notifications", style: .text) {
                    Task { await coordinator.handleNotNowTapped() }
                }
                .fullWidth()
                .disabled(coordinator.isSubmitting)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled(coordinator.isSubmitting)
    }
}

#Preview {
    Color.clear
        .sheet(isPresented: .constant(true)) {
            NotificationPermissionExplainerSheet()
                .environmentObject(PermissionPromptCoordinator.shared)
        }
}
