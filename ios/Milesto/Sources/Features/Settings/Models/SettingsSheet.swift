import Foundation

enum SettingsSheet: Identifiable {
    case name
    case birthYear
    case coach
    case language

    var id: Self {
        self
    }
}
