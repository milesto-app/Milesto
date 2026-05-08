import Auth
import Foundation

enum SupabaseClient {
    private static let supabaseURL = URL(string: "https://db.milesto.app/auth/v1")!
    private static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloamNwbmNmZnR5aHRxbm5xb25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMTEwNTcsImV4cCI6MjA4NTU4NzA1N30.cK6Otz0Uxu_tEQ36ZtKeAuov-p3KjBAfuN2BWnb-wf4"

    static let client = AuthClient(
        url: supabaseURL,
        headers: [
            "apikey": supabaseAnonKey,
            "Authorization": "Bearer \(supabaseAnonKey)",
        ],
        localStorage: AuthClient.Configuration.defaultLocalStorage,
        autoRefreshToken: true,
        emitLocalSessionAsInitialSession: true
    )
}
