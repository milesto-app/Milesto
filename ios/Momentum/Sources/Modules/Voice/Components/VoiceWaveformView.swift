import SwiftUI

struct VoiceWaveformView: View {
    @State private var isAnimating = false

    private let barCount = 5
    private let barWidth: CGFloat = 3
    private let maxHeight: CGFloat = 20
    private let minHeight: CGFloat = 4

    var body: some View {
        HStack(spacing: 2) {
            ForEach(0 ..< barCount, id: \.self) { index in
                RoundedRectangle(cornerRadius: barWidth / 2)
                    .fill(AppTheme.Colors.accent)
                    .frame(width: barWidth, height: isAnimating ? barHeight(for: index) : minHeight)
                    .animation(
                        .easeInOut(duration: 0.5)
                            .repeatForever(autoreverses: true)
                            .delay(Double(index) * 0.1),
                        value: isAnimating
                    )
            }
        }
        .frame(width: 40, height: maxHeight)
        .onAppear { isAnimating = true }
        .onDisappear { isAnimating = false }
    }

    private func barHeight(for index: Int) -> CGFloat {
        let heights: [CGFloat] = [0.6, 1.0, 0.75, 0.9, 0.5]
        return maxHeight * heights[index % heights.count]
    }
}
