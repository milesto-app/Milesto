import SwiftUI

struct AppBackground: ViewModifier {
    var ignoresSafeArea = true

    func body(content: Content) -> some View {
        ZStack {
            if ignoresSafeArea {
                Color("BackgroundPrimary").ignoresSafeArea()
            } else {
                Color("BackgroundPrimary")
            }

            content
        }
        .background(Color("BackgroundPrimary"))
    }
}

extension View {
    func appBackground(ignoresSafeArea: Bool = true) -> some View {
        modifier(AppBackground(ignoresSafeArea: ignoresSafeArea))
    }

    func appScrollBackground() -> some View {
        scrollContentBackground(.hidden)
            .background(Color("BackgroundPrimary"))
    }

    func appPresentationBackground() -> some View {
        presentationBackground(Color("BackgroundPrimary"))
    }
}
