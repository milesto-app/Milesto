import SwiftUI

struct PaywallAmbientGlow: View {
    let scale: CGFloat
    let opacity: Double

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color("Brand").opacity(0.35),
                                Color("Brand").opacity(0.1),
                                Color.clear,
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: geo.size.width * 0.7
                        )
                    )
                    .frame(width: geo.size.width * 1.4, height: geo.size.width * 1.4)
                    .offset(x: -geo.size.width * 0.35, y: -geo.size.height * 0.22)
                    .scaleEffect(scale)
                    .opacity(opacity)
                    .blur(radius: 40)

                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color("Brand").opacity(0.18),
                                Color.clear,
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: geo.size.width * 0.5
                        )
                    )
                    .frame(width: geo.size.width, height: geo.size.width)
                    .offset(x: geo.size.width * 0.3, y: geo.size.height * 0.18)
                    .blur(radius: 60)
            }
        }
    }
}
