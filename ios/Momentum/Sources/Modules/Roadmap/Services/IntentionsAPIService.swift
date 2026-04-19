import Foundation

final class IntentionsAPIService {
    static let shared = IntentionsAPIService()

    private init() {}

    struct EmptyResponse: Decodable {}

    struct OptionalIntention: Decodable {
        let taskId: String?
        let dayOfWeek: Int?
        let localHour: Int?
        let locationLabel: String?

        enum CodingKeys: String, CodingKey {
            case taskId = "task_id"
            case dayOfWeek = "day_of_week"
            case localHour = "local_hour"
            case locationLabel = "location_label"
        }

        func intention() -> WeeklyTaskIntentionDTO? {
            guard let taskId, let dayOfWeek, let localHour else { return nil }
            return WeeklyTaskIntentionDTO(
                taskId: taskId,
                dayOfWeek: dayOfWeek,
                localHour: localHour,
                locationLabel: locationLabel
            )
        }
    }

    func upsert(taskId: String, dayOfWeek: Int, localHour: Int, locationLabel: String?) async throws -> WeeklyTaskIntentionDTO {
        let request = UpsertIntentionRequest(
            taskId: taskId,
            dayOfWeek: dayOfWeek,
            localHour: localHour,
            locationLabel: locationLabel?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == true
                ? nil
                : locationLabel
        )
        return try await BackendClient.shared.request(
            method: "POST",
            path: "intentions",
            body: request
        )
    }

    func get(taskId: String) async throws -> WeeklyTaskIntentionDTO? {
        let response: OptionalIntention? = try await BackendClient.shared.request(
            method: "GET",
            path: "intentions?task_id=\(taskId)"
        )
        return response?.intention()
    }

    func delete(taskId: String) async throws {
        try await BackendClient.shared.requestVoid(
            method: "DELETE",
            path: "intentions/\(taskId)"
        )
    }
}
