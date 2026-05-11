import SwiftUI

struct IntakeTextField: View {
    @Binding var text: String
    var placeholder: LocalizedStringKey = ""
    var table: String?
    var multiline: Bool = false
    var minHeight: CGFloat = 140
    var maxHeight: CGFloat = 220
    var submitLabel: SubmitLabel = .done
    var onSubmit: (() -> Void)?

    @FocusState private var isFocused: Bool

    private var borderColor: Color {
        isFocused ? Color("Brand") : Color("TextSecondary").opacity(0.18)
    }

    private let cornerRadius: CGFloat = 14
    private let singleLineHeight: CGFloat = 56

    var body: some View {
        ZStack(alignment: multiline ? .topLeading : .leading) {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(Color("BackgroundSecondary"))

            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .strokeBorder(borderColor, lineWidth: 1)

            if text.isEmpty {
                Text(placeholder, tableName: table)
                    .font(Fonts.ui(size: 17, relativeTo: .body))
                    .foregroundColor(Color("TextSecondary").opacity(0.7))
                    .padding(.horizontal, multiline ? 17 : 16)
                    .padding(.top, multiline ? 16 : 0)
                    .frame(
                        maxWidth: .infinity,
                        maxHeight: multiline ? .infinity : .infinity,
                        alignment: multiline ? .topLeading : .leading
                    )
                    .allowsHitTesting(false)
            }

            field
                .font(Fonts.ui(size: 17, relativeTo: .body))
                .foregroundColor(Color("TextPrimary"))
        }
        .frame(
            minHeight: multiline ? minHeight : singleLineHeight,
            maxHeight: multiline ? maxHeight : singleLineHeight
        )
        .contentShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .onTapGesture {
            if !isFocused {
                Haptics.soft(intensity: 0.6)
            }
            isFocused = true
        }
    }

    @ViewBuilder
    private var field: some View {
        if multiline {
            TextEditor(text: $text)
                .focused($isFocused)
                .scrollContentBackground(.hidden)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
        } else {
            TextField("", text: $text)
                .focused($isFocused)
                .submitLabel(submitLabel)
                .onSubmit { onSubmit?() }
                .padding(.horizontal, 16)
        }
    }
}
