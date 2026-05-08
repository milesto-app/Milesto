import SwiftUI

struct ChatInputBar: View {
    @Binding var text: String
    var isDisabled: Bool
    var isFocused: FocusState<Bool>.Binding
    var onSend: () -> Void

    private let sendHaptic = UIImpactFeedbackGenerator(style: .medium)

    var body: some View {
        HStack(alignment: .bottom, spacing: 12) {
            ChatField(
                text: $text,
                placeholder: "chat.input.placeholder",
                table: "Chat",
                isFocused: isFocused
            )
            .padding(.horizontal, 16)
            .padding(.vertical, 16)

            if hasText {
                Button {
                    sendHaptic.impactOccurred()
                    onSend()
                } label: {
                    TablerIcons(.arrowUp, size: 18, color: Color("TextPrimary"))
                        .frame(width: 32, height: 32)
                        .background(isDisabled ? Color("TextSecondary") : Color("BrandDeep"), in: Circle())
                }
                .disabled(isDisabled)
                .padding(.trailing, 12)
                .padding(.bottom, 10)
                .transition(.opacity)
            } else {
                TranscriptionToggleButton(transcribedText: $text, size: .compact)
                    .padding(.trailing, 12)
                    .padding(.bottom, 10)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: hasText)
        .animation(.easeInOut(duration: 0.2), value: isDisabled)
        .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 24))
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }

    private var hasText: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}
