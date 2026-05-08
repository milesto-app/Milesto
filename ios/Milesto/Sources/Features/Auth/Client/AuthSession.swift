import Auth
import Foundation

enum AuthSession {
    static func accessToken() async throws -> String {
        try await SupabaseClient.client.session.accessToken
    }

    static func refreshAccessToken() async throws -> String {
        try await SupabaseClient.client.refreshSession().accessToken
    }

    static func userUUID() async throws -> UUID {
        try await SupabaseClient.client.session.user.id
    }

    static func userEmail() async throws -> String? {
        try await SupabaseClient.client.session.user.email
    }

    static func userMetadataString(_ key: String) async throws -> String? {
        try await SupabaseClient.client.session.user.userMetadata[key]?.stringValue
    }
}
