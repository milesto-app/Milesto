import SwiftUI

struct ChatInputBar: View {
    @Binding var text: String
    var isDisabled: Bool
    var isFocused: FocusState<Bool>.Binding
    var onSend: () -> Void

    var body: some View {
        HStack(alignment: .bottom, spacing: 12) {
            TextField(String(localized: "chat.input.placeholder", table: "Chat"), text: $text, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(1 ... 6)
                .focused(isFocused)
                .padding(.horizontal, 16)
                .padding(.vertical, 16)

            if hasText {
                Button {
                    onSend()
                } label: {
                    TablerIcons(.arrowUp, size: 18, color: Colors.textOnAccent)
                        .frame(width: 32, height: 32)
                        .background(isDisabled ? Colors.textSecondary : Colors.accent, in: Circle())
                }
                .disabled(isDisabled)
                .padding(.trailing, 12)
                .padding(.bottom, 10)
                .transition(.opacity)
            } else {
                VoiceToggleButton(transcribedText: $text, coachId: nil, size: .compact)
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
