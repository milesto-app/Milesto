import SwiftUI

struct AppLoader: View {
    var size: CGFloat = 20
    var color: Color = .init("Brand")
    var lineWidth: CGFloat = 2.4

    @State private var rotation: Angle = .zero

    var body: some View {
        Circle()
            .trim(from: 0.18, to: 0.82)
            .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
            .frame(width: size, height: size)
            .rotationEffect(rotation)
            .onAppear {
                withAnimation(.linear(duration: 0.75).repeatForever(autoreverses: false)) {
                    rotation = .degrees(360)
                }
            }
    }
}
