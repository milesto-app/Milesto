import SwiftUI

struct StatsProgressBar: View {
    let progress: Double
    var height: CGFloat = 8

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color("TextSecondary").opacity(0.12))

                Capsule()
                    .fill(Color("Brand"))
                    .frame(width: geometry.size.width * max(0, min(1, progress)))
            }
        }
        .frame(height: height)
    }
}
