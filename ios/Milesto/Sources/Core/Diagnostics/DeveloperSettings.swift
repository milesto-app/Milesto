#if DEBUG
    import Foundation
    import Observation

    enum DeveloperRouteOverride: String, CaseIterable, Identifiable {
        case none
        case profileOnboarding
        case goalIntake
        case roadmapGeneration
        case paywall

        var id: String {
            rawValue
        }

        var title: String {
            switch self {
            case .none:
                "Normal routing"
            case .profileOnboarding:
                "Profile onboarding"
            case .goalIntake:
                "Goal intake"
            case .roadmapGeneration:
                "Roadmap generation"
            case .paywall:
                "Paywall"
            }
        }
    }

    @MainActor
    @Observable
    final class DeveloperSettings {
        static let shared = DeveloperSettings()

        private let routeOverrideKey = "developer.routeOverride"

        var routeOverride: DeveloperRouteOverride {
            didSet {
                UserDefaults.standard.set(routeOverride.rawValue, forKey: routeOverrideKey)
            }
        }

        private init() {
            let rawValue = UserDefaults.standard.string(forKey: routeOverrideKey)
            routeOverride = rawValue.flatMap(DeveloperRouteOverride.init(rawValue:)) ?? .none
        }

        var forcesPaywall: Bool {
            routeOverride == .paywall
        }

        var bypassesPaywall: Bool {
            false
        }

        func clearRouteOverride() {
            routeOverride = .none
        }
    }
#endif
