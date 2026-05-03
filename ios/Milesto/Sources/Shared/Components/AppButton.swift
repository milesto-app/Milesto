import SwiftUI

enum AppButtonStyle {
    case primary
    case neutral
    case secondary
    case text

    var backgroundColor: Color {
        switch self {
        case .primary, .neutral, .secondary, .text: return Color.clear
        }
    }

    var foregroundColor: Color {
        switch self {
        case .primary: return Color("TextOnBrand")
        case .neutral: return Color("TextPrimary")
        case .secondary: return Color("Brand")
        case .text: return Color("Brand")
        }
    }

    var usesGlass: Bool {
        switch self {
        case .primary, .neutral: return true
        case .secondary, .text: return false
        }
    }

    var glassTint: Color {
        switch self {
        case .primary: return Color("BrandDeep")
        case .neutral: return Color("BackgroundElevated")
        case .secondary, .text: return Color.clear
        }
    }

    var borderColor: Color {
        switch self {
        case .primary, .neutral, .text: return Color.clear
        case .secondary: return Color("Brand")
        }
    }

    var borderWidth: CGFloat {
        switch self {
        case .primary, .neutral, .text: return 0
        case .secondary: return 2
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
                TablerIcons(icon, size: 20, color: style.foregroundColor)
            }

            Text(title, tableName: table)
                .font(Fonts.ui(size: 17, relativeTo: .headline, weight: .semibold))

            if let icon = icon, iconPosition == .trailing {
                TablerIcons(icon, size: 20, color: style.foregroundColor)
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
                    .glassEffect(.regular.interactive().tint(style.glassTint), in: RoundedRectangle(cornerRadius: 12))
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
