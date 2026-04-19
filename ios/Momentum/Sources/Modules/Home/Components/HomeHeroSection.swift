import SwiftUI

struct HomeHeroSection: View {
    let formattedDate: String
    let title: String
    let progress: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 6) {
                AppText(verbatim: formattedDate, style: .caption)
                    .color(Color("TextSecondary"))

                AppText(verbatim: title, style: .title)
            }

            VStack(alignment: .leading, spacing: 8) {
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color("TextSecondary").opacity(0.3))
                            .frame(height: 10)
                        Capsule()
                            .fill(Color("TintPrimary"))
                            .frame(
                                width: max(geometry.size.width * progress, progress > 0 ? 10 : 0),
                                height: 10
                            )
                            .animation(.easeInOut(duration: 0.3), value: progress)
                    }
                }
                .frame(height: 10)

                HStack {
                    AppText(
                        verbatim: "\(Int(progress * 100))%",
                        style: .subheadline
                    )
                    .weight(.semibold)
                    .color(Color("TintPrimary"))
                    .contentTransition(.numericText())
                    .animation(.easeInOut(duration: 0.3), value: progress)
                    Spacer()
                }
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 32)
        .padding(.bottom, 32)
    }
}
