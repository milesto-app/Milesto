import Foundation
import Supabase

enum AuthSession {
    static func accessToken() async throws -> String {
        try await SupabaseClient.client.auth.session.accessToken
    }

    static func refreshAccessToken() async throws -> String {
        try await SupabaseClient.client.auth.refreshSession().accessToken
    }

    static func userUUID() async throws -> UUID {
        try await SupabaseClient.client.auth.session.user.id
    }

    static func userEmail() async throws -> String? {
        try await SupabaseClient.client.auth.session.user.email
    }

    static func userMetadataString(_ key: String) async throws -> String? {
        try await SupabaseClient.client.auth.session.user.userMetadata[key]?.stringValue
    }
}
