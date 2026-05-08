import SwiftUI

struct PaywallConnectionErrorView: View {
    let onRetry: () async -> Void
    @State private var isRetrying = false

    var body: some View {
        ZStack {
            VStack(spacing: 16) {
                TablerIcons(.cloudOff, size: 48, color: Color("TextSecondary"))
                AppText("paywall.connection.error.title", table: "Paywall", style: .title)
                    .alignment(.center)
                AppText("paywall.connection.error.message", table: "Paywall", style: .body)
                    .color(Color("TextSecondary"))
                    .alignment(.center)
                AppButton("common.retry", table: "Common") {
                    guard !isRetrying else { return }
                    isRetrying = true
                    Task {
                        await onRetry()
                        isRetrying = false
                    }
                }
                .icon(.refresh, position: .leading)
                .padding(.top, 8)
            }
            .padding(.horizontal, 32)
        }
        .appBackground()
        .overlay(alignment: .topTrailing) {
            SignOutGlassButton()
                .padding(.top, 8)
                .padding(.trailing, 16)
        }
    }
}
