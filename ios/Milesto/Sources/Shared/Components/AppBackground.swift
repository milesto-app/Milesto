import SwiftUI

struct AppBackground: ViewModifier {
    var ignoresSafeArea = true

    func body(content: Content) -> some View {
        ZStack {
            if ignoresSafeArea {
                Color("BackgroundBase").ignoresSafeArea()
            } else {
                Color("BackgroundBase")
            }

            content
        }
        .background(Color("BackgroundBase"))
    }
}

extension View {
    func appBackground(ignoresSafeArea: Bool = true) -> some View {
        modifier(AppBackground(ignoresSafeArea: ignoresSafeArea))
    }

    func appScrollBackground() -> some View {
        scrollContentBackground(.hidden)
            .background(Color("BackgroundBase"))
    }

    func appPresentationBackground() -> some View {
        presentationBackground(Color("BackgroundBase"))
    }
}
