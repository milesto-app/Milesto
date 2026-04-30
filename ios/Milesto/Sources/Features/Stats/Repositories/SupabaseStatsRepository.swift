import Foundation
import Supabase

@MainActor
final class SupabaseStatsRepository: RemoteStatsRepository {
    init() {}

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

private extension SupabaseStatsRepository {
    struct TaskRow: Decodable {
        let isCompleted: Bool
        let weeklyPlanId: String
        let createdAt: String
        let completedAt: String?

        enum CodingKeys: String, CodingKey {
            case isCompleted = "is_completed"
            case weeklyPlanId = "weekly_plan_id"
            case createdAt = "created_at"
            case completedAt = "completed_at"
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
            .select("is_completed, weekly_plan_id, created_at, completed_at")
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

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let isoFormatterNoFraction = ISO8601DateFormatter()
        isoFormatterNoFraction.formatOptions = [.withInternetDateTime]

        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())

        let completionDays: [Date] = tasks.compactMap { task in
            guard task.isCompleted, let raw = task.completedAt else { return nil }
            let parsed = isoFormatter.date(from: raw) ?? isoFormatterNoFraction.date(from: raw)
            guard let date = parsed else { return nil }
            return calendar.startOfDay(for: date)
        }

        let completionsByDay: [Date: Int] = completionDays.reduce(into: [:]) { acc, day in
            acc[day, default: 0] += 1
        }

        var last7Days: [DayActivityDTO] = []
        var maxDailyInWindow = 0
        for offset in (0 ..< 7).reversed() {
            guard let day = calendar.date(byAdding: .day, value: -offset, to: today) else { continue }
            let count = completionsByDay[day] ?? 0
            maxDailyInWindow = max(maxDailyInWindow, count)
            last7Days.append(DayActivityDTO(
                date: dateFormatter.string(from: day),
                objectivesCompleted: count,
                objectivesTotal: 0
            ))
        }
        let dailyTarget = max(maxDailyInWindow, 1)
        last7Days = last7Days.map {
            DayActivityDTO(
                date: $0.date,
                objectivesCompleted: $0.objectivesCompleted,
                objectivesTotal: dailyTarget
            )
        }

        let uniqueDays = Set(completionDays)
        var currentStreak = 0
        var cursor = today
        while uniqueDays.contains(cursor) {
            currentStreak += 1
            guard let prev = calendar.date(byAdding: .day, value: -1, to: cursor) else { break }
            cursor = prev
        }

        var bestStreak = 0
        let sortedDays = uniqueDays.sorted()
        var run = 0
        var previous: Date?
        for day in sortedDays {
            if let prev = previous, calendar.date(byAdding: .day, value: 1, to: prev) == day {
                run += 1
            } else {
                run = 1
            }
            bestStreak = max(bestStreak, run)
            previous = day
        }
        bestStreak = max(bestStreak, currentStreak)

        return StreakStatsDTO(current: currentStreak, best: bestStreak, last7Days: last7Days)
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
        let mondayOfWeek = calendar.date(byAdding: .day, value: -daysFromMonday, to: calendar.startOfDay(for: today)) ?? calendar.startOfDay(for: today)

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
