import SwiftUI

struct AppTextField: View {
    @Binding var text: String
    var label: LocalizedStringKey?
    var placeholder: LocalizedStringKey = ""
    var icon: TablerIconOutline?
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
    @State private var isPasswordVisible: Bool = false

    private var shouldFloatLabel: Bool {
        label != nil && (isFocused || !text.isEmpty)
    }

    private var hasError: Bool {
        errorMessage != nil
    }

    private var borderColor: Color {
        if hasError {
            return Color("StatusError")
        } else if isFocused {
            return Color("TintPrimary")
        }
        return Color("TextSecondary").opacity(0.2)
    }

    private var iconColor: Color {
        if hasError {
            return Color("StatusError")
        } else if isFocused {
            return Color("TintPrimary")
        }
        return Color("TextSecondary")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ZStack(alignment: multiline ? .topLeading : .leading) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color("BgSurface"))
                    .frame(height: multiline ? 150 : 56)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(borderColor, lineWidth: hasError || isFocused ? 2 : 1)
                    )

                HStack(alignment: multiline ? .top : .center, spacing: 12) {
                    if let icon = icon {
                        TablerIcons(icon, size: 20, color: iconColor)
                            .frame(width: 20)
                            .padding(.top, multiline ? 16 : 0)
                    }

                    ZStack(alignment: multiline ? .topLeading : .leading) {
                        if let label = label {
                            Text(label, tableName: table)
                                .font(shouldFloatLabel ? Fonts.ui(size: 12, relativeTo: .caption) : Fonts.ui(size: 17, relativeTo: .body))
                                .foregroundColor(hasError ? Color("StatusError") : (isFocused ? Color("TintPrimary") : Color("TextSecondary")))
                                .offset(y: shouldFloatLabel ? (multiline ? 0 : -12) : (multiline ? 8 : 0))
                                .animation(.easeOut(duration: 0.2), value: shouldFloatLabel)
                        }

                        if text.isEmpty && (label == nil || shouldFloatLabel) {
                            Text(label == nil ? placeholder : (shouldFloatLabel ? placeholder : ""), tableName: table)
                                .foregroundColor(Color("TextSecondary"))
                                .offset(y: label != nil ? (multiline ? 20 : 6) : 0)
                        }

                        Group {
                            if multiline {
                                TextEditor(text: $text)
                                    .focused($isFocused)
                                    .scrollContentBackground(.hidden)
                                    .padding(.leading, -3)
                            } else if isSecure && !isPasswordVisible {
                                SecureField("", text: $text)
                                    .focused($isFocused)
                                    .submitLabel(submitLabel)
                                    .onSubmit { onSubmit?() }
                            } else {
                                TextField("", text: $text)
                                    .focused($isFocused)
                                    .submitLabel(submitLabel)
                                    .onSubmit { onSubmit?() }
                            }
                        }
                        .textContentType(textContentType)
                        .autocorrectionDisabled(autocorrectionDisabled)
                        .offset(y: label != nil ? (multiline ? 12 : 6) : 0)
                    }

                    if isSecure {
                        Button {
                            isPasswordVisible.toggle()
                        } label: {
                            TablerIcons(isPasswordVisible ? .eyeOff : .eye, size: 16, color: Color("TextSecondary"))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, multiline ? 8 : 0)
            }
            .frame(height: multiline ? 150 : 56)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .font(Fonts.ui(size: 12, relativeTo: .caption))
                    .foregroundColor(Color("StatusError"))
                    .padding(.horizontal, 4)
            } else if let helperText = helperText {
                Text(helperText)
                    .font(Fonts.ui(size: 12, relativeTo: .caption))
                    .foregroundColor(Color("TextSecondary"))
                    .padding(.horizontal, 4)
            }
        }
    }
}

#Preview("Empty State") {
    VStack(spacing: 20) {
        AppTextField(text: .constant(""), placeholder: "Email")
        AppTextField(text: .constant(""), label: "Email", placeholder: "Enter your email")
    }
    .padding()
}

#Preview("With Icon") {
    VStack(spacing: 20) {
        AppTextField(text: .constant(""), label: "Email", placeholder: "Enter your email", icon: .mail)
        AppTextField(text: .constant("john@example.com"), label: "Email", icon: .mail)
    }
    .padding()
}

#Preview("Password Field") {
    VStack(spacing: 20) {
        AppTextField(text: .constant(""), label: "Password", placeholder: "Enter password", icon: .lock, isSecure: true)
        AppTextField(text: .constant("secret123"), label: "Password", icon: .lock, isSecure: true)
    }
    .padding()
}

#Preview("Error State") {
    VStack(spacing: 20) {
        AppTextField(
            text: .constant("invalid"),
            label: "Email",
            icon: .mail,
            errorMessage: "Please enter a valid email address"
        )
    }
    .padding()
}

#Preview("With Helper Text") {
    VStack(spacing: 20) {
        AppTextField(
            text: .constant(""),
            label: "Username",
            placeholder: "Choose a username",
            icon: .user,
            helperText: "Must be at least 3 characters"
        )
    }
    .padding()
}
