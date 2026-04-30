import SwiftUI

enum Fonts {
    static func display(size: CGFloat, relativeTo textStyle: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        ui(size: size, relativeTo: textStyle, weight: weight)
    }

    static func ui(size: CGFloat, relativeTo textStyle: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        let name = switch weight {
        case .bold, .heavy, .black: "Geist-Bold"
        case .semibold: "Geist-SemiBold"
        case .medium: "Geist-Medium"
        default: "Geist-Regular"
        }
        return .custom(name, size: size, relativeTo: textStyle)
    }
}
