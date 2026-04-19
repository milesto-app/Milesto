import SwiftUI

struct HomeSyncErrorSection: View {
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            TablerIcons(.cloudOff, size: 40, color: Color("TextSecondary"))
            AppText("home.sync.error", table: "Home", style: .subheadline)
                .color(Color("TextSecondary"))
                .alignment(.center)
            AppButton("home.sync.retry", table: "Home", style: .secondary, action: onRetry)
                .icon(.refresh)
        }
        .padding(.top, 40)
        .padding(.horizontal, 32)
    }
}
