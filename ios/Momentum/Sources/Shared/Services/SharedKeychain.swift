import Foundation
import Security

enum SharedKeychainKey: String {
    case supabaseAccessToken = "supabase_access_token"
    case supabaseAccessTokenExpiresAt = "supabase_access_token_expires_at"
    case apnsDeviceToken = "apns_device_token"
}

enum SharedKeychain {
    static let accessGroup = "app.momentum-ai.shared"

    private static var fullAccessGroup: String {
        guard let prefix = teamIdentifierPrefix() else { return accessGroup }
        return "\(prefix)\(accessGroup)"
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
        remove(.apnsDeviceToken)
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

    static func setAPNSDeviceToken(_ token: String?) {
        set(.apnsDeviceToken, value: token)
    }

    static func apnsDeviceToken() -> String? {
        string(.apnsDeviceToken)
    }

    private static func teamIdentifierPrefix() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "_momentum_team_prefix_probe",
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        _ = SecItemCopyMatching(query as CFDictionary, &result)
        if let attributes = result as? [String: Any],
           let group = attributes[kSecAttrAccessGroup as String] as? String,
           let dotIndex = group.firstIndex(of: ".")
        {
            return String(group[..<group.index(after: dotIndex)])
        }
        if let infoDict = Bundle.main.infoDictionary,
           let appID = infoDict["AppIdentifierPrefix"] as? String
        {
            return appID
        }
        return nil
    }
}
