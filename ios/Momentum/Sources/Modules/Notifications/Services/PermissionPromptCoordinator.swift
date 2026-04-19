import Combine
import Foundation
import UserNotifications

enum NotifPermissionStatus: String {
    case notRequested = "not_requested"
    case granted
    case denied
}

@MainActor
final class PermissionPromptCoordinator: ObservableObject {
    static let shared = PermissionPromptCoordinator()

    @Published var isExplainerVisible = false
    @Published private(set) var isSubmitting = false

    private var cachedStatus: NotifPermissionStatus = .notRequested
    private var accountCreatedAt: Date?
    private var didFireThisSession = false
    private var boundAccountId: String?

    private init() {}

    func updateFromProfile(userId: String?, status: String?, accountCreatedAt: Date?) {
        if userId != boundAccountId {
            boundAccountId = userId
            didFireThisSession = false
            isExplainerVisible = false
        }
        self.accountCreatedAt = accountCreatedAt
        if let status, let parsed = NotifPermissionStatus(rawValue: status) {
            cachedStatus = parsed
        } else {
            cachedStatus = .notRequested
        }
    }

    func tryTriggerOnFirstCoachReveal() {
        attemptTrigger()
    }

    func tryTriggerOnFirstRoadmapDisplay() {
        attemptTrigger()
    }

    func tryTriggerFallback() {
        guard let createdAt = accountCreatedAt else { return }
        guard Date().timeIntervalSince(createdAt) >= 24 * 60 * 60 else { return }
        attemptTrigger()
    }

    func handleEnableTapped() async {
        guard !isSubmitting else { return }
        isSubmitting = true
        defer { isSubmitting = false }

        let granted = await NotificationService.shared.requestPermissionAndRegister()
        let status: NotifPermissionStatus = granted ? .granted : .denied
        await persist(status: status)
        isExplainerVisible = false
    }

    func handleNotNowTapped() {
        isExplainerVisible = false
    }

    private func attemptTrigger() {
        guard !didFireThisSession else { return }
        guard cachedStatus == .notRequested else { return }
        Task { await evaluateAndMaybeShow() }
    }

    private func evaluateAndMaybeShow() async {
        guard cachedStatus == .notRequested, !didFireThisSession else { return }
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        switch settings.authorizationStatus {
        case .notDetermined:
            didFireThisSession = true
            isExplainerVisible = true
        case .authorized, .provisional:
            cachedStatus = .granted
            await persist(status: .granted)
            await NotificationService.shared.refreshRegistrationIfAuthorized()
        case .denied:
            cachedStatus = .denied
            await persist(status: .denied)
        default:
            break
        }
    }

    private func persist(status: NotifPermissionStatus) async {
        cachedStatus = status
        var fields = ProfileUpdateFields()
        fields.notifPermissionStatus = status.rawValue
        _ = try? await ProfileService.shared.updateProfile(fields)
    }
}
