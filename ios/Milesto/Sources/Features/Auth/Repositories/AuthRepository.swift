import Foundation

@MainActor
protocol AuthRepository: AuthSessionProviding {
    func consumePendingAppleName() -> (firstName: String?, lastName: String?)
}
