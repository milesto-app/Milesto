import SwiftUI

struct AppTextField: View {
    @Binding var text: String
    var label: LocalizedStringKey?
    var placeholder: LocalizedStringKey = ""
    var table: String?
    var isSecure: Bool = false
    var errorMessage: String?
    var helperText: String?
    var textContentType: UITextContentType?
    var autocorrectionDisabled: Bool = false
    var multiline: Bool = false
    var submitLabel: SubmitLabel = .done
    var onSubmit: (() -> Void)?

    @FocusState private var isFocused: Bool
    @State private var isPasswordVisible = false

    private let cornerRadius: CGFloat = 16
    private let fieldHeight: CGFloat = 56
    private let multilineHeight: CGFloat = 150

    private var prompt: Text {
        Text(label ?? placeholder, tableName: table)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            fieldContainer

            if let errorMessage {
                AppText(verbatim: errorMessage, style: .caption)
                    .color(Color("Error"))
                    .padding(.horizontal, 4)
            } else if let helperText {
                AppText(verbatim: helperText, style: .caption)
                    .color(Color("TextSecondary"))
                    .padding(.horizontal, 4)
            }
        }
    }

    private var fieldContainer: some View {
        HStack(alignment: multiline ? .top : .center, spacing: 12) {
            inputView

            if isSecure {
                Button {
                    Haptics.light()
                    isPasswordVisible.toggle()
                } label: {
                    TablerIcons(isPasswordVisible ? .eyeOff : .eye, size: 20, color: Color("TextSecondary"))
                        .frame(width: 24, height: 24)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .frame(height: multiline ? multilineHeight : fieldHeight)
        .background(Color("BackgroundTertiary"))
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        .contentShape(RoundedRectangle(cornerRadius: cornerRadius))
        .onTapGesture {
            if !isFocused {
                Haptics.soft(intensity: 0.6)
            }
            isFocused = true
        }
    }

    @ViewBuilder
    private var inputView: some View {
        if multiline {
            ZStack(alignment: .topLeading) {
                if text.isEmpty {
                    prompt
                        .font(Fonts.ui(size: 17, relativeTo: .body))
                        .foregroundStyle(Color("TextSecondary"))
                        .padding(.top, 16)
                        .allowsHitTesting(false)
                }

                TextEditor(text: $text)
                    .focused($isFocused)
                    .scrollContentBackground(.hidden)
                    .font(Fonts.ui(size: 17, relativeTo: .body))
                    .foregroundStyle(Color("TextPrimary"))
                    .padding(.vertical, 8)
                    .padding(.horizontal, -5)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if isSecure && !isPasswordVisible {
            SecureField("", text: $text, prompt: prompt.foregroundColor(Color("TextSecondary")))
                .focused($isFocused)
                .textContentType(textContentType)
                .autocorrectionDisabled(autocorrectionDisabled)
                .submitLabel(submitLabel)
                .font(Fonts.ui(size: 17, relativeTo: .body))
                .foregroundStyle(Color("TextPrimary"))
                .onSubmit { onSubmit?() }
        } else {
            TextField("", text: $text, prompt: prompt.foregroundColor(Color("TextSecondary")))
                .focused($isFocused)
                .textContentType(textContentType)
                .autocorrectionDisabled(autocorrectionDisabled)
                .submitLabel(submitLabel)
                .font(Fonts.ui(size: 17, relativeTo: .body))
                .foregroundStyle(Color("TextPrimary"))
                .onSubmit { onSubmit?() }
        }
    }
}
