import SwiftUI

struct ChatEmptyState: View {
    var isVisible: Bool
    var onSelectPrompt: (String) -> Void

    @State private var appeared = false

    private var shouldShow: Bool {
        appeared && isVisible
    }

    private let prompts: [(icon: TablerIcon, key: String)] = [
        (.targetArrow, "chat.prompt.progress"),
        (.bulb, "chat.prompt.motivation"),
        (.calendarEvent, "chat.prompt.today"),
        (.trendingUp, "chat.prompt.improve"),
    ]

    private let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16),
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(Array(prompts.enumerated()), id: \.offset) { index, prompt in
                Button {
                    Haptics.light()
                    onSelectPrompt(String(localized: String.LocalizationValue(prompt.key), table: "Chat"))
                } label: {
                    VStack(alignment: .leading, spacing: 12) {
                        TablerIcons(prompt.icon, size: 24, color: Color("Brand"))
                            .frame(width: 40, height: 40)
                            .background(Color("Brand").opacity(0.1), in: .circle)

                        AppText(LocalizedStringKey(prompt.key), table: "Chat", style: .subheadline)
                            .color(Color("TextPrimary"))
                            .multilineTextAlignment(.leading)
                            .lineLimit(2)

                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 16))
                }
                .opacity(shouldShow ? 1 : 0)
                .scaleEffect(shouldShow ? 1 : 0.95)
                .animation(.easeOut(duration: 0.3).delay(Double(index) * 0.05), value: shouldShow)
            }
        }
        .padding(.horizontal, 16)
        .allowsHitTesting(shouldShow)
        .onAppear {
            appeared = true
        }
    }
}
