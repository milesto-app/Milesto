import SwiftUI

enum AppButtonStyle {
    case primary
    case secondary
    case text

    var backgroundColor: Color {
        switch self {
        case .primary: return .clear
        case .secondary: return Color.clear
        case .text: return Color.clear
        }
    }

    var foregroundColor: Color {
        switch self {
        case .primary: return Colors.textOnAccent
        case .secondary: return Colors.accent
        case .text: return Colors.accent
        }
    }

    var usesGlass: Bool {
        switch self {
        case .primary: return true
        case .secondary, .text: return false
        }
    }

    var borderColor: Color {
        switch self {
        case .primary: return Color.clear
        case .secondary: return Colors.accent
        case .text: return Color.clear
        }
    }

    var borderWidth: CGFloat {
        switch self {
        case .primary: return 0
        case .secondary: return 2
        case .text: return 0
        }
    }
}

enum AppButtonIconPosition {
    case leading
    case trailing
}

struct AppButton: View {
    private let title: LocalizedStringKey
    private let table: String?
    private let action: () -> Void
    private let style: AppButtonStyle
    private var icon: TablerIconOutline?
    private var iconPosition: AppButtonIconPosition
    private var isFullWidth: Bool
    private var isDisabled: Bool

    init(_ title: LocalizedStringKey, table: String? = nil, style: AppButtonStyle = .primary, action: @escaping () -> Void) {
        self.title = title
        self.table = table
        self.action = action
        self.style = style
        iconPosition = .leading
        isFullWidth = false
        isDisabled = false
    }

    private var buttonContent: some View {
        HStack(spacing: 8) {
            if let icon = icon, iconPosition == .leading {
                TablerIcon(icon, size: 20, color: style.foregroundColor)
            }

            Text(title, tableName: table)
                .font(.headline)

            if let icon = icon, iconPosition == .trailing {
                TablerIcon(icon, size: 20, color: style.foregroundColor)
            }
        }
        .frame(maxWidth: isFullWidth ? .infinity : nil)
        .padding(.vertical, 16)
        .padding(.horizontal, 24)
        .background(style.backgroundColor)
        .foregroundStyle(style.foregroundColor)
    }

    var body: some View {
        Button(action: action) {
            if style.usesGlass {
                buttonContent
                    .glassEffect(.regular.interactive().tint(Colors.accent), in: RoundedRectangle(cornerRadius: 12))
            } else {
                buttonContent
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(style.borderColor, lineWidth: style.borderWidth)
                    )
            }
        }
        .opacity(isDisabled ? 0.5 : 1.0)
        .disabled(isDisabled)
    }

    func icon(_ icon: TablerIconOutline, position: AppButtonIconPosition = .leading) -> AppButton {
        var copy = self
        copy.icon = icon
        copy.iconPosition = position
        return copy
    }

    func fullWidth(_ isFullWidth: Bool = true) -> AppButton {
        var copy = self
        copy.isFullWidth = isFullWidth
        return copy
    }

    func disabled(_ isDisabled: Bool) -> AppButton {
        var copy = self
        copy.isDisabled = isDisabled
        return copy
    }
}

#Preview("Primary Buttons") {
    VStack(spacing: 16) {
        AppButton("Primary Button", style: .primary) {}

        AppButton("Full Width", style: .primary) {}
            .fullWidth()

        AppButton("Disabled", style: .primary) {}
            .fullWidth()
            .disabled(true)

        AppButton("With Icon", style: .primary) {}
            .icon(.arrowRight, position: .trailing)
            .fullWidth()
    }
    .padding()
}

#Preview("Secondary Buttons") {
    VStack(spacing: 16) {
        AppButton("Secondary", style: .secondary) {}

        AppButton("Full Width", style: .secondary) {}
            .fullWidth()

        AppButton("Disabled", style: .secondary) {}
            .fullWidth()
            .disabled(true)

        AppButton("With Icon", style: .secondary) {}
            .icon(.plus, position: .leading)
    }
    .padding()
}

#Preview("Text Buttons") {
    VStack(spacing: 16) {
        AppButton("Text Button", style: .text) {}

        AppButton("Disabled", style: .text) {}
            .disabled(true)

        AppButton("Skip", style: .text) {}
            .icon(.chevronRight, position: .trailing)
    }
    .padding()
}
