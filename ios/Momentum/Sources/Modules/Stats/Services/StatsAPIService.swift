import Foundation
import Supabase

final class StatsAPIService {
    static let shared = StatsAPIService()

    private init() {}

    func getStats(goalId: String) async throws -> StatsDTO {
        async let checkInsResult = fetchCheckIns(goalId: goalId)
        async let objectivesResult = fetchObjectives(goalId: goalId)
        async let weeklyPlansResult = fetchWeeklyPlans(goalId: goalId)
        async let milestonesResult = fetchMilestones(goalId: goalId)

        let checkIns = (try? await checkInsResult) ?? []
        let objectives = (try? await objectivesResult) ?? []
        let weeklyPlans = (try? await weeklyPlansResult) ?? []
        let milestones = (try? await milestonesResult) ?? []

        let streak = computeStreak(checkIns: checkIns, objectives: objectives)
        let completion = computeCompletion(objectives: objectives)
        let energy = computeEnergy(checkIns: checkIns)
        let weeklyProgress = computeWeeklyProgress(weeklyPlans: weeklyPlans, objectives: objectives)
        let milestoneProgress = computeMilestones(milestones: milestones, weeklyPlans: weeklyPlans)

        return StatsDTO(
            streak: streak,
            completion: completion,
            energy: energy,
            weeklyProgress: weeklyProgress,
            milestones: milestoneProgress
        )
    }
}

private extension StatsAPIService {
    struct CheckInRow: Decodable {
        let date: String
        let energyLevel: String

        enum CodingKeys: String, CodingKey {
            case date
            case energyLevel = "energy_level"
        }
    }

    struct ObjectiveRow: Decodable {
        let date: String
        let isCompleted: Bool
        let weeklyPlanId: String

        enum CodingKeys: String, CodingKey {
            case date
            case isCompleted = "is_completed"
            case weeklyPlanId = "weekly_plan_id"
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

    func fetchCheckIns(goalId: String) async throws -> [CheckInRow] {
        try await Supabase.client
            .from("check_ins")
            .select("date, energy_level")
            .eq("goal_id", value: goalId)
            .order("date", ascending: false)
            .execute()
            .value
    }

    func fetchObjectives(goalId: String) async throws -> [ObjectiveRow] {
        try await Supabase.client
            .from("daily_objectives")
            .select("date, is_completed, weekly_plan_id")
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

    func computeStreak(checkIns: [CheckInRow], objectives: [ObjectiveRow]) -> StreakStatsDTO {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.timeZone = .current

        let checkInDates = Set(checkIns.map(\.date))

        let sortedDates = checkInDates.compactMap { dateFormatter.date(from: $0) }.sorted(by: >)

        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let yesterday = calendar.date(byAdding: .day, value: -1, to: today)!

        var currentStreak = 0
        if let firstDate = sortedDates.first {
            let firstDay = calendar.startOfDay(for: firstDate)
            if firstDay == today || firstDay == yesterday {
                currentStreak = 1
                var expectedDate = calendar.date(byAdding: .day, value: -1, to: firstDay)!
                for date in sortedDates.dropFirst() {
                    let day = calendar.startOfDay(for: date)
                    if day == expectedDate {
                        currentStreak += 1
                        expectedDate = calendar.date(byAdding: .day, value: -1, to: day)!
                    } else if day < expectedDate {
                        break
                    }
                }
            }
        }

        var bestStreak = 0
        if !sortedDates.isEmpty {
            var runLength = 1
            for i in 1 ..< sortedDates.count {
                let prev = calendar.startOfDay(for: sortedDates[i - 1])
                let curr = calendar.startOfDay(for: sortedDates[i])
                let diff = calendar.dateComponents([.day], from: curr, to: prev).day ?? 0
                if diff == 1 {
                    runLength += 1
                } else {
                    bestStreak = max(bestStreak, runLength)
                    runLength = 1
                }
            }
            bestStreak = max(bestStreak, runLength)
        }

        let objectivesByDate = Dictionary(grouping: objectives, by: \.date)

        var last7Days: [DayActivityDTO] = []
        for offset in (0 ..< 7).reversed() {
            let day = calendar.date(byAdding: .day, value: -offset, to: today)!
            let dateString = dateFormatter.string(from: day)
            let dayObjectives = objectivesByDate[dateString] ?? []
            last7Days.append(DayActivityDTO(
                date: dateString,
                hasCheckIn: checkInDates.contains(dateString),
                objectivesCompleted: dayObjectives.filter(\.isCompleted).count,
                objectivesTotal: dayObjectives.count
            ))
        }

        return StreakStatsDTO(current: currentStreak, best: bestStreak, last7Days: last7Days)
    }

    func computeCompletion(objectives: [ObjectiveRow]) -> CompletionStatsDTO {
        let totalObjectives = objectives.count
        let totalCompleted = objectives.filter(\.isCompleted).count
        let overallRate = totalObjectives > 0 ? Double(totalCompleted) / Double(totalObjectives) : 0

        let calendar = Calendar.current
        let today = Date()
        let weekday = calendar.component(.weekday, from: today)
        let daysFromMonday = (weekday + 5) % 7
        let mondayOfWeek = calendar.date(byAdding: .day, value: -daysFromMonday, to: calendar.startOfDay(for: today))!

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        dateFormatter.timeZone = .current
        let mondayString = dateFormatter.string(from: mondayOfWeek)

        let thisWeekObjectives = objectives.filter { $0.date >= mondayString }
        let thisWeekCompleted = thisWeekObjectives.filter(\.isCompleted).count
        let thisWeekRate = thisWeekObjectives.isEmpty ? 0 : Double(thisWeekCompleted) / Double(thisWeekObjectives.count)

        return CompletionStatsDTO(
            overallRate: overallRate,
            thisWeekRate: thisWeekRate,
            totalCompleted: totalCompleted,
            totalObjectives: totalObjectives
        )
    }

    func computeEnergy(checkIns: [CheckInRow]) -> EnergyStatsDTO {
        var high = 0, good = 0, low = 0, veryLow = 0
        for checkIn in checkIns {
            switch checkIn.energyLevel {
            case "high": high += 1
            case "good": good += 1
            case "low": low += 1
            case "very_low": veryLow += 1
            default: break
            }
        }

        let recent = Array(checkIns.prefix(14)).reversed().map { entry in
            EnergyEntryDTO(date: entry.date, level: entry.energyLevel)
        }

        return EnergyStatsDTO(
            distribution: EnergyDistributionDTO(high: high, good: good, low: low, veryLow: veryLow),
            recentHistory: Array(recent)
        )
    }

    func computeWeeklyProgress(weeklyPlans: [WeeklyPlanRow], objectives: [ObjectiveRow]) -> [WeeklyProgressDTO] {
        let objectivesByPlan = Dictionary(grouping: objectives, by: \.weeklyPlanId)

        return weeklyPlans.map { plan in
            let planObjectives = objectivesByPlan[plan.id] ?? []
            let completed = planObjectives.filter(\.isCompleted).count
            let total = planObjectives.count
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
