import Combine
import SwiftUI

struct ChatThinkingIndicator: View {
    private let labels: [LocalizedStringResource] = [
        LocalizedStringResource("chat.thinking.1", table: "Chat"),
        LocalizedStringResource("chat.thinking.2", table: "Chat"),
        LocalizedStringResource("chat.thinking.3", table: "Chat"),
        LocalizedStringResource("chat.thinking.4", table: "Chat"),
    ]

    @State private var currentIndex = 0
    @State private var shimmerOffset: CGFloat = -0.3
    @State private var textOpacity: Double = 1.0

    private let timer = Timer.publish(every: 3, on: .main, in: .common).autoconnect()

    var body: some View {
        HStack {
            AppText(verbatim: String(localized: labels[currentIndex]), style: .body)
                .color(Color("TextPrimary"))
                .opacity(textOpacity)
                .mask(shimmerMask)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 4)
        .onAppear {
            withAnimation(.linear(duration: 0.8).repeatForever(autoreverses: false)) {
                shimmerOffset = 1.3
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
                Color("TextPrimary").opacity(0.5),
                Color("TextPrimary"),
                Color("TextPrimary").opacity(0.5),
            ],
            startPoint: UnitPoint(x: shimmerOffset - 0.3, y: 0.5),
            endPoint: UnitPoint(x: shimmerOffset + 0.3, y: 0.5)
        )
    }
}
