import Foundation

enum SettingsSheet: Identifiable {
    case name
    case birthdate
    case coach
    case language

    var id: Self {
        self
    }
}
