import SwiftUI

enum AppButtonStyle {
    case primary
    case secondary
    case ghost

    var backgroundColor: Color {
        switch self {
        case .primary: return Color("Brand")
        case .secondary: return Color("BackgroundTertiary")
        case .ghost: return Color.clear
        }
    }

    var foregroundColor: Color {
        switch self {
        case .primary: return Color("BrandDeep")
        case .secondary: return Color("TextPrimary")
        case .ghost: return Color("Brand")
        }
    }
}

enum AppButtonIconPosition {
    case leading
    case trailing
}

struct AppButton: View {
    private let cornerRadius: CGFloat = 16
    private let title: LocalizedStringKey
    private let table: String?
    private let action: () -> Void
    private let style: AppButtonStyle
    private var icon: TablerIconOutline?
    private var iconPosition: AppButtonIconPosition
    private var isFullWidth: Bool
    private var isDisabled: Bool
    private var isLoading: Bool

    init(_ title: LocalizedStringKey, table: String? = nil, style: AppButtonStyle = .primary, action: @escaping () -> Void) {
        self.title = title
        self.table = table
        self.action = action
        self.style = style
        iconPosition = .leading
        isFullWidth = false
        isDisabled = false
        isLoading = false
    }

    private var buttonContent: some View {
        ZStack {
            HStack(spacing: 8) {
                if let icon = icon, iconPosition == .leading {
                    TablerIcons(icon, size: 20, color: style.foregroundColor)
                }

                Text(title, tableName: table)
                    .font(Fonts.ui(size: 17, relativeTo: .headline, weight: .regular))

                if let icon = icon, iconPosition == .trailing {
                    TablerIcons(icon, size: 20, color: style.foregroundColor)
                }
            }
            .opacity(isLoading ? 0 : 1)

            if isLoading {
                AppButtonLoadingIndicator(color: style.foregroundColor)
                    .transition(.opacity)
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
            buttonContent
                .cornerRadius(cornerRadius)
        }
        .opacity(isDisabled ? 0.5 : 1.0)
        .disabled(isDisabled || isLoading)
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

    func loading(_ isLoading: Bool = true) -> AppButton {
        var copy = self
        copy.isLoading = isLoading
        return copy
    }
}

private struct AppButtonLoadingIndicator: View {
    let color: Color
    @State private var rotation: Angle = .zero

    var body: some View {
        Circle()
            .trim(from: 0.18, to: 0.82)
            .stroke(color, style: StrokeStyle(lineWidth: 2.4, lineCap: .round))
            .frame(width: 20, height: 20)
            .rotationEffect(rotation)
            .onAppear {
                withAnimation(.linear(duration: 0.75).repeatForever(autoreverses: false)) {
                    rotation = .degrees(360)
                }
            }
    }
}
