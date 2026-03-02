import SwiftUI

struct ChatInputBar: View {
    @Binding var text: String
    var isDisabled: Bool
    var onSend: () -> Void

    var body: some View {
        HStack(spacing: AppTheme.Spacing.sm) {
            TextField(String(localized: "chat.input.placeholder", table: "Chat"), text: $text)
                .textFieldStyle(.plain)
                .padding(.horizontal, AppTheme.Spacing.md)
                .padding(.vertical, AppTheme.Spacing.md)
                .disabled(isDisabled)
                .onSubmit {
                    guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !isDisabled else { return }
                    onSend()
                }

            if canSend {
                Button {
                    onSend()
                } label: {
                    TablerIcon(.arrowUp, size: 18, color: AppTheme.Colors.textOnAccent)
                        .frame(width: 32, height: 32)
                        .background(AppTheme.Colors.accent, in: Circle())
                }
                .padding(.trailing, AppTheme.Spacing.sm)
                .transition(.opacity)
            } else if !isDisabled {
                VoiceToggleButton(transcribedText: $text, coachId: nil, size: .compact)
                    .padding(.trailing, AppTheme.Spacing.sm)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.2), value: canSend)
        .animation(.easeInOut(duration: 0.2), value: isDisabled)
        .glassEffect(.clear.interactive(), in: .capsule)
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(.bottom, 0)
    }

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isDisabled
    }
}
