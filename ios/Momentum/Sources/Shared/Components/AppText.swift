import SwiftUI

enum AppTextStyle {
    case largeTitle
    case title
    case headline
    case body
    case subheadline
    case caption

    var font: Font {
        switch self {
        case .largeTitle: return .largeTitle
        case .title: return .title
        case .headline: return .headline
        case .body: return .body
        case .subheadline: return .subheadline
        case .caption: return .caption
        }
    }

    var tracking: CGFloat {
        switch self {
        case .largeTitle: return -1.5
        case .title: return -1.0
        case .headline: return -0.5
        case .body, .subheadline, .caption: return 0
        }
    }

    var defaultWeight: Font.Weight {
        switch self {
        case .largeTitle, .title, .headline:
            return .bold
        case .body, .subheadline, .caption:
            return .regular
        }
    }

    var defaultColor: Color {
        switch self {
        case .largeTitle, .title, .headline, .body:
            return AppTheme.Colors.textPrimary
        case .subheadline, .caption:
            return AppTheme.Colors.textSecondary
        }
    }
}

struct AppText: View {
    private let content: Text
    private let style: AppTextStyle
    private var weight: Font.Weight?
    private var color: Color?
    private var alignment: TextAlignment

    init(_ text: LocalizedStringKey, table: String? = nil, style: AppTextStyle) {
        content = Text(text, tableName: table)
        self.style = style
        alignment = .leading
    }

    init(verbatim text: String, style: AppTextStyle) {
        content = Text(verbatim: text)
        self.style = style
        alignment = .leading
    }

    var body: some View {
        content
            .font(style.font)
            .fontWeight(weight ?? style.defaultWeight)
            .tracking(style.tracking)
            .foregroundStyle(color ?? style.defaultColor)
            .multilineTextAlignment(alignment)
    }

    func weight(_ weight: Font.Weight) -> AppText {
        var copy = self
        copy.weight = weight
        return copy
    }

    func color(_ color: Color) -> AppText {
        var copy = self
        copy.color = color
        return copy
    }

    func alignment(_ alignment: TextAlignment) -> AppText {
        var copy = self
        copy.alignment = alignment
        return copy
    }
}

#Preview {
    VStack(spacing: 16) {
        AppText("Large Title", style: .largeTitle)
        AppText("Title", style: .title)
        AppText("Headline", style: .headline)
        AppText("Body text", style: .body)
        AppText("Subheadline", style: .subheadline)
        AppText("Caption", style: .caption)

        Divider()

        AppText("Custom color", style: .body)
            .color(.red)
        AppText("Custom weight", style: .body)
            .weight(.semibold)
        AppText("Centered text", style: .body)
            .alignment(.center)
    }
    .padding()
}
