import SwiftUI

extension View {
    func hapticRefreshable(action: @escaping @Sendable () async -> Void) -> some View {
        refreshable {
            let impact = UIImpactFeedbackGenerator(style: .medium)
            impact.prepare()
            impact.impactOccurred()

            try? await Task.sleep(for: .milliseconds(800))
            await action()

            let notification = UINotificationFeedbackGenerator()
            notification.notificationOccurred(.success)
        }
    }
}
