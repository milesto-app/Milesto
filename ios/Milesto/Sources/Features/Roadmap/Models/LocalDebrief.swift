import Foundation
import SwiftData

@Model
final class LocalDebrief {
    @Attribute(.unique) var id: String
    var goalId: String
    var userId: String
    var weeklyPlanId: String?
    var date: String
    var note: String
    var taskRatingTaskIds: [String]
    var taskRatingValues: [String]
    var createdAt: String

    init(id: String, goalId: String, userId: String, weeklyPlanId: String? = nil, date: String, note: String, taskRatings: [TaskRating], createdAt: String) {
        self.id = id
        self.goalId = goalId
        self.userId = userId
        self.weeklyPlanId = weeklyPlanId
        self.date = date
        self.note = note
        taskRatingTaskIds = taskRatings.map(\.taskId)
        taskRatingValues = taskRatings.map(\.rating.rawValue)
        self.createdAt = createdAt
    }

    var taskRatings: [TaskRating] {
        zip(taskRatingTaskIds, taskRatingValues).compactMap { taskId, rawValue in
            guard let rating = DifficultyRating(rawValue: rawValue) else { return nil }
            return TaskRating(taskId: taskId, rating: rating)
        }
    }

    func update(with debrief: Debrief) {
        note = debrief.note
        weeklyPlanId = debrief.weeklyPlanId
        taskRatingTaskIds = debrief.taskRatings.map(\.taskId)
        taskRatingValues = debrief.taskRatings.map(\.rating.rawValue)
    }
}
