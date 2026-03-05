import SwiftUI

enum Colors {
    static let accent = Color(red: 0.18, green: 0.72, blue: 0.53)
    static let success = Color.green
    static let warning = Color(red: 0.95, green: 0.78, blue: 0.42)
    static let error = Color.red
    static let disabled = Color.gray

    static let textPrimary = Color.primary
    static let textSecondary = Color.secondary
    static let textPlaceholder = Color(.placeholderText)
    static let textOnAccent = Color.white

    static let iconDefault = Color(.label).opacity(0.7)

    static let nodeUpcoming = Color(UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0.35, green: 0.35, blue: 0.34, alpha: 1)
            : UIColor(red: 0.88, green: 0.87, blue: 0.86, alpha: 1)
    })

    static let codeBackground = Color(.systemGray5)

    static let fieldBackground = Color(.secondarySystemBackground)
    static let fieldBorderFocused = Color(red: 0.18, green: 0.72, blue: 0.53)
    static let fieldBorderError = Color.red
    static let fieldBorderDefault = Color(.separator).opacity(0.45)
}
