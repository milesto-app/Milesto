import SwiftUI

struct ChatInputBar: View {
    @Binding var text: String
    var isDisabled: Bool
    var isFocused: FocusState<Bool>.Binding
    var onSend: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: AppTheme.Spacing.sm) {
            TextField(String(localized: "chat.input.placeholder", table: "Chat"), text: $text, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(1...6)
                .focused(isFocused)
                .padding(.horizontal, AppTheme.Spacing.md)
                .padding(.vertical, AppTheme.Spacing.md)
                .disabled(isDisabled)

            if canSend {
                Button {
                    onSend()
                } label: {
                    TablerIcon(.arrowUp, size: 18, color: AppTheme.Colors.textOnAccent)
                        .frame(width: 32, height: 32)
                        .background(AppTheme.Colors.accent, in: Circle())
                }
                .padding(.trailing, AppTheme.Spacing.sm)
                .padding(.bottom, 10)
                .transition(.opacity)
            } else if !isDisabled {
                VoiceToggleButton(transcribedText: $text, coachId: nil, size: .compact)
                    .padding(.trailing, AppTheme.Spacing.sm)
                    .padding(.bottom, 10)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: canSend)
        .animation(.easeInOut(duration: 0.2), value: isDisabled)
        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 24))
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(.bottom, 0)
    }

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isDisabled
    }
}
