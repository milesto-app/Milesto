import SwiftUI

struct ChatInputBar: View {
    @Binding var text: String
    var isDisabled: Bool
    var onSend: () -> Void

    var body: some View {
        HStack(spacing: AppTheme.Spacing.sm) {
            TextField(String(localized: "chat.input.placeholder", table: "Chat"), text: $text)
                .textFieldStyle(.plain)
                .padding(.horizontal, AppTheme.Spacing.sm)
                .padding(.vertical, AppTheme.Spacing.sm)
                .disabled(isDisabled)
                .onSubmit {
                    guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty, !isDisabled else { return }
                    onSend()
                }

            Button {
                onSend()
            } label: {
                TablerIcon(.send, size: 20, color: canSend ? AppTheme.Colors.accent : AppTheme.Colors.disabled)
            }
            .disabled(!canSend)
            .padding(.trailing, AppTheme.Spacing.xs)
        }
        .background(
            RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg)
                .fill(AppTheme.Colors.fieldBackground)
        )
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(.bottom, AppTheme.Spacing.xs)
    }

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isDisabled
    }
}
