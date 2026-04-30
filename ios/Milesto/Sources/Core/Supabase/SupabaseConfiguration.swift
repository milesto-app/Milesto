import Foundation
import Supabase

enum SupabaseConfig {
    static let client: SupabaseClient = {
        let bundle = Bundle.main
        guard let urlString = bundle.object(forInfoDictionaryKey: "SupabaseURL") as? String,
              !urlString.isEmpty,
              let url = URL(string: urlString),
              let anonKey = bundle.object(forInfoDictionaryKey: "SupabaseAnonKey") as? String,
              !anonKey.isEmpty
        else {
            preconditionFailure("Missing SupabaseURL or SupabaseAnonKey in Info.plist")
        }
        return SupabaseClient(
            supabaseURL: url,
            supabaseKey: anonKey,
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    autoRefreshToken: true,
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
    }()
}
