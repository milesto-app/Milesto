import Combine
import SwiftUI

struct ThinkingIndicator: View {
    private let labels: [LocalizedStringResource] = [
        LocalizedStringResource("chat.thinking.1", table: "Chat"),
        LocalizedStringResource("chat.thinking.2", table: "Chat"),
        LocalizedStringResource("chat.thinking.3", table: "Chat"),
        LocalizedStringResource("chat.thinking.4", table: "Chat"),
    ]

    @State private var currentIndex = 0
    @State private var shimmerOffset: CGFloat = -1.0
    @State private var textOpacity: Double = 1.0

    private let timer = Timer.publish(every: 3, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack {
            AppText(verbatim: String(localized: labels[currentIndex]), style: .body)
                .color(AppTheme.Colors.textPrimary)
                .opacity(textOpacity)
                .mask(shimmerMask)
            Spacer()
        }
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(.vertical, AppTheme.Spacing.xxs)
        .onAppear {
            withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                shimmerOffset = 1.0
            }
        }
        .onReceive(timer) { _ in
            withAnimation(.easeInOut(duration: 0.25)) {
                textOpacity = 0
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                currentIndex = (currentIndex + 1) % labels.count
                withAnimation(.easeInOut(duration: 0.25)) {
                    textOpacity = 1
                }
            }
        }
    }

    private var shimmerMask: some View {
        LinearGradient(
            colors: [
                .white.opacity(0.5),
                .white,
                .white.opacity(0.5),
            ],
            startPoint: UnitPoint(x: shimmerOffset - 0.3, y: 0.5),
            endPoint: UnitPoint(x: shimmerOffset + 0.3, y: 0.5)
        )
    }
}
