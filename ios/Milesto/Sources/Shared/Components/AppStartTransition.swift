import SwiftUI

struct AppStartTransition: ViewModifier {
    @State private var hasAppeared = false

    func body(content: Content) -> some View {
        content
            .opacity(hasAppeared ? 1 : 0)
            .onAppear {
                withAnimation(.easeInOut(duration: 0.4)) {
                    hasAppeared = true
                }
            }
    }
}

extension View {
    func appStartTransition() -> some View {
        modifier(AppStartTransition())
    }
}
