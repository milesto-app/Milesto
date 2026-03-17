import Foundation
import Supabase

final class StatsAPIService {
    static let shared = StatsAPIService()

    private init() {}

    func getStats(goalId: String) async throws -> StatsDTO {
        async let tasksResult = fetchTasks(goalId: goalId)
        async let weeklyPlansResult = fetchWeeklyPlans(goalId: goalId)
        async let milestonesResult = fetchMilestones(goalId: goalId)

        let tasks = (try? await tasksResult) ?? []
        let weeklyPlans = (try? await weeklyPlansResult) ?? []
        let milestones = (try? await milestonesResult) ?? []

        let streak = computeStreak(tasks: tasks)
        let completion = computeCompletion(tasks: tasks)
        let weeklyProgress = computeWeeklyProgress(weeklyPlans: weeklyPlans, tasks: tasks)
        let milestoneProgress = computeMilestones(milestones: milestones, weeklyPlans: weeklyPlans)

        return StatsDTO(
            streak: streak,
            completion: completion,
            weeklyProgress: weeklyProgress,
            milestones: milestoneProgress
        )
    }
}

private extension StatsAPIService {
    struct TaskRow: Decodable {
        let isCompleted: Bool
        let weeklyPlanId: String
        let createdAt: String

        enum CodingKeys: String, CodingKey {
            case isCompleted = "is_completed"
            case weeklyPlanId = "weekly_plan_id"
            case createdAt = "created_at"
        }
    }

    struct WeeklyPlanRow: Decodable {
        let id: String
        let weekNumber: Int
        let milestoneId: String
        let status: String

        enum CodingKeys: String, CodingKey {
            case id, status
            case weekNumber = "week_number"
            case milestoneId = "milestone_id"
        }
    }

    struct MilestoneRow: Decodable {
        let id: String
    }

    func fetchTasks(goalId: String) async throws -> [TaskRow] {
        try await Supabase.client
            .from("weekly_tasks")
            .select("is_completed, weekly_plan_id, created_at")
            .eq("goal_id", value: goalId)
            .execute()
            .value
    }

    func fetchWeeklyPlans(goalId: String) async throws -> [WeeklyPlanRow] {
        try await Supabase.client
            .from("weekly_plans")
            .select("id, week_number, milestone_id, status")
            .eq("goal_id", value: goalId)
            .order("week_number")
            .execute()
            .value
    }

    func fetchMilestones(goalId: String) async throws -> [MilestoneRow] {
        try await Supabase.client
            .from("milestones")
            .select("id")
            .eq("goal_id", value: goalId)
            .execute()
            .value
    }

    func computeStreak(tasks: [TaskRow]) -> StreakStatsDTO {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.timeZone = .current

        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())

        let completed = tasks.filter(\.isCompleted).count
        let total = tasks.count

        var last7Days: [DayActivityDTO] = []
        for offset in (0 ..< 7).reversed() {
            let day = calendar.date(byAdding: .day, value: -offset, to: today)!
            let dateString = dateFormatter.string(from: day)
            last7Days.append(DayActivityDTO(
                date: dateString,
                objectivesCompleted: offset == 0 ? completed : 0,
                objectivesTotal: offset == 0 ? total : 0
            ))
        }

        return StreakStatsDTO(current: 0, best: 0, last7Days: last7Days)
    }

    func computeCompletion(tasks: [TaskRow]) -> CompletionStatsDTO {
        let totalTasks = tasks.count
        let totalCompleted = tasks.filter(\.isCompleted).count
        let overallRate = totalTasks > 0 ? Double(totalCompleted) / Double(totalTasks) : 0

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let calendar = Calendar.current
        let today = Date()
        let weekday = calendar.component(.weekday, from: today)
        let daysFromMonday = (weekday + 5) % 7
        let mondayOfWeek = calendar.date(byAdding: .day, value: -daysFromMonday, to: calendar.startOfDay(for: today))!

        let thisWeekTasks = tasks.filter {
            guard let date = isoFormatter.date(from: $0.createdAt) else { return false }
            return date >= mondayOfWeek
        }
        let thisWeekCompleted = thisWeekTasks.filter(\.isCompleted).count
        let thisWeekRate = thisWeekTasks.isEmpty ? 0 : Double(thisWeekCompleted) / Double(thisWeekTasks.count)

        return CompletionStatsDTO(
            overallRate: overallRate,
            thisWeekRate: thisWeekRate,
            totalCompleted: totalCompleted,
            totalObjectives: totalTasks
        )
    }

    func computeWeeklyProgress(weeklyPlans: [WeeklyPlanRow], tasks: [TaskRow]) -> [WeeklyProgressDTO] {
        let tasksByPlan = Dictionary(grouping: tasks, by: \.weeklyPlanId)

        return weeklyPlans.map { plan in
            let planTasks = tasksByPlan[plan.id] ?? []
            let completed = planTasks.filter(\.isCompleted).count
            let total = planTasks.count
            let rate = total > 0 ? Double(completed) / Double(total) : 0

            return WeeklyProgressDTO(
                weekNumber: plan.weekNumber,
                completionRate: rate,
                objectivesCompleted: completed,
                objectivesTotal: total
            )
        }
    }

    func computeMilestones(milestones: [MilestoneRow], weeklyPlans: [WeeklyPlanRow]) -> MilestoneProgressDTO {
        let plansByMilestone = Dictionary(grouping: weeklyPlans, by: \.milestoneId)

        let completedCount = milestones.filter { milestone in
            let plans = plansByMilestone[milestone.id] ?? []
            return !plans.isEmpty && plans.allSatisfy { $0.status == "completed" }
        }.count

        return MilestoneProgressDTO(completed: completedCount, total: milestones.count)
    }
}
