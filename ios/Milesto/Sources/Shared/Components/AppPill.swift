import SwiftUI

private enum AppPillText {
    case localized(LocalizedStringKey, table: String?)
    case verbatim(String)
}

struct AppPill: View {
    @Environment(\.colorScheme) private var colorScheme

    private let text: AppPillText
    private let tint: Color
    private let icon: TablerIconOutline?

    init(
        _ key: LocalizedStringKey,
        table: String? = nil,
        tint: Color = Color("Brand"),
        icon: TablerIconOutline? = nil
    ) {
        text = .localized(key, table: table)
        self.tint = tint
        self.icon = icon
    }

    init(
        verbatim text: String,
        tint: Color = Color("Brand"),
        icon: TablerIconOutline? = nil
    ) {
        self.text = .verbatim(text)
        self.tint = tint
        self.icon = icon
    }

    var body: some View {
        HStack(spacing: 4) {
            if let icon {
                TablerIcons(icon, size: 13, color: foregroundColor)
            }

            label
        }
        .padding(.horizontal, horizontalPadding)
        .padding(.vertical, verticalPadding)
        .background(Capsule().fill(backgroundColor))
        .overlay(
            Capsule()
                .strokeBorder(borderColor, lineWidth: 1)
        )
    }

    @ViewBuilder
    private var label: some View {
        switch text {
        case let .localized(key, table):
            AppText(key, table: table, style: .caption)
                .weight(.semibold)
                .color(foregroundColor)
                .lineLimit(1)
        case let .verbatim(value):
            AppText(verbatim: value, style: .caption)
                .weight(.semibold)
                .color(foregroundColor)
                .lineLimit(1)
        }
    }

    private var foregroundColor: Color {
        tint
    }

    private var backgroundColor: Color {
        tint.opacity(colorScheme == .dark ? 0.2 : 0.14)
    }

    private var borderColor: Color {
        tint.opacity(colorScheme == .dark ? 0.28 : 0.18)
    }

    private var horizontalPadding: CGFloat {
        icon == nil ? 8 : 9
    }

    private var verticalPadding: CGFloat {
        4
    }
}
