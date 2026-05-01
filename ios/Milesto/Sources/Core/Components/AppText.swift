import SwiftUI

enum AppTextStyle {
    case largeTitle
    case title
    case headline
    case body
    case subheadline
    case caption

    func font(weight: Font.Weight) -> Font {
        switch self {
        case .largeTitle:
            return Fonts.display(size: 34, relativeTo: .largeTitle, weight: weight)
        case .title:
            return Fonts.display(size: 28, relativeTo: .title, weight: weight)
        case .headline:
            return Fonts.display(size: 20, relativeTo: .headline, weight: weight)
        case .body:
            return Fonts.ui(size: 17, relativeTo: .body, weight: weight)
        case .subheadline:
            return Fonts.ui(size: 15, relativeTo: .subheadline, weight: weight)
        case .caption:
            return Fonts.ui(size: 12, relativeTo: .caption, weight: weight)
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
            return .medium
        case .body, .subheadline, .caption:
            return .regular
        }
    }

    var defaultColor: Color {
        switch self {
        case .largeTitle, .title, .headline, .body:
            return Color("TextPrimary")
        case .subheadline, .caption:
            return Color("TextSecondary")
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
            .font(style.font(weight: weight ?? style.defaultWeight))
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
