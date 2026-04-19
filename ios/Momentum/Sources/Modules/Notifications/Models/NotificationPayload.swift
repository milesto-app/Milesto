import Foundation

struct NotificationPayload {
    let jobId: String?
    let kind: String?
    let reveal: String?
    let ctaDeeplink: URL?
    let whyDeeplink: URL?

    init(userInfo: [AnyHashable: Any]) {
        jobId = userInfo["job_id"] as? String
        kind = userInfo["kind"] as? String
        reveal = userInfo["reveal"] as? String
        if let cta = userInfo["cta_deeplink"] as? String {
            ctaDeeplink = URL(string: cta)
        } else {
            ctaDeeplink = nil
        }
        if let why = userInfo["why_deeplink"] as? String {
            whyDeeplink = URL(string: why)
        } else {
            whyDeeplink = nil
        }
    }
}
