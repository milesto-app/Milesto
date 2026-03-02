import Foundation
import Supabase

enum SupabaseConfig {
    static let projectURL = URL(string: "https://api.momentum-ai.app")!
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloamNwbmNmZnR5aHRxbm5xb25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMTEwNTcsImV4cCI6MjA4NTU4NzA1N30.cK6Otz0Uxu_tEQ36ZtKeAuov-p3KjBAfuN2BWnb-wf4"

    static let client = SupabaseClient(
        supabaseURL: projectURL,
        supabaseKey: anonKey,
        options: SupabaseClientOptions(
            auth: SupabaseClientOptions.AuthOptions(
                autoRefreshToken: true,
                emitLocalSessionAsInitialSession: true
            )
        )
    )
}
