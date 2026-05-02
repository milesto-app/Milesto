import Foundation
import Security

nonisolated enum KeychainKey: String {
    case supabaseAccessToken = "supabase_access_token"
    case supabaseAccessTokenExpiresAt = "supabase_access_token_expires_at"
}

nonisolated enum Keychain {
    private static let accessGroupSuffix = "app.milesto.shared"

    private static var fullAccessGroup: String {
        guard let prefix = Bundle.main.object(forInfoDictionaryKey: "AppIdentifierPrefix") as? String,
              !prefix.isEmpty,
              !prefix.contains("$(")
        else { return accessGroupSuffix }
        return "\(prefix)\(accessGroupSuffix)"
    }

    private static func set(account: String, value: String?) {
        guard let value else {
            remove(account: account)
            return
        }
        guard let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: fullAccessGroup,
        ]

        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]

        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var addQuery = query
            for (attrKey, attrValue) in attributes {
                addQuery[attrKey] = attrValue
            }
            SecItemAdd(addQuery as CFDictionary, nil)
        }
    }

    private static func remove(account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: account,
            kSecAttrAccessGroup as String: fullAccessGroup,
        ]
        SecItemDelete(query as CFDictionary)
    }

    static func set(_ key: KeychainKey, value: String?) {
        set(account: key.rawValue, value: value)
    }

    static func remove(_ key: KeychainKey) {
        remove(account: key.rawValue)
    }

    static func clearAll() {
        remove(.supabaseAccessToken)
        remove(.supabaseAccessTokenExpiresAt)
    }

    static func setSupabaseAccessToken(_ token: String?, expiresAt: Date?) {
        set(.supabaseAccessToken, value: token)
        if let expiresAt {
            set(.supabaseAccessTokenExpiresAt, value: String(expiresAt.timeIntervalSince1970))
        } else {
            remove(.supabaseAccessTokenExpiresAt)
        }
    }

    static func setPendingSubscriptionJWS(_ jws: String, key: String) {
        set(account: key, value: jws)
    }
}
