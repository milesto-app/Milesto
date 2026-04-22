import Foundation
import Security

nonisolated enum SharedKeychainKey: String {
    case supabaseAccessToken = "supabase_access_token"
    case supabaseAccessTokenExpiresAt = "supabase_access_token_expires_at"
}

nonisolated enum SharedKeychain {
    private static let accessGroupSuffix = "app.momentum-ai.shared"

    private static var fullAccessGroup: String {
        guard let prefix = Bundle.main.object(forInfoDictionaryKey: "AppIdentifierPrefix") as? String,
              !prefix.isEmpty,
              !prefix.contains("$(")
        else { return accessGroupSuffix }
        return "\(prefix)\(accessGroupSuffix)"
    }

    static func set(_ key: SharedKeychainKey, value: String?) {
        guard let value else {
            remove(key)
            return
        }
        guard let data = value.data(using: .utf8) else { return }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key.rawValue,
            kSecAttrAccessGroup as String: fullAccessGroup,
        ]

        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
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

    static func string(_ key: SharedKeychainKey) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key.rawValue,
            kSecAttrAccessGroup as String: fullAccessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8)
        else { return nil }
        return value
    }

    static func remove(_ key: SharedKeychainKey) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key.rawValue,
            kSecAttrAccessGroup as String: fullAccessGroup,
        ]
        SecItemDelete(query as CFDictionary)
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

    static func supabaseAccessToken() -> (token: String, expiresAt: Date)? {
        guard let token = string(.supabaseAccessToken),
              let expiryString = string(.supabaseAccessTokenExpiresAt),
              let expiry = TimeInterval(expiryString)
        else { return nil }
        return (token, Date(timeIntervalSince1970: expiry))
    }
}
