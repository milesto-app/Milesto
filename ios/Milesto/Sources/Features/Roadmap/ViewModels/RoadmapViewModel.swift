import Foundation

@MainActor
@Observable
final class RoadmapViewModel {
    @ObservationIgnored private let env: AppEnv

    private(set) var goalId: String = ""
    private(set) var goalTitle: String = ""
    private(set) var milestones: [DisplayMilestone] = []
    private(set) var isLoading = true
    var appeared = false

    init(env: AppEnv) {
        self.env = env
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func resetForGoalChange() {
        milestones = []
        goalTitle = ""
        isLoading = true
        appeared = false
    }

    func loadMilestones() async {
        guard !goalId.isEmpty else { return }

        let goal = try? await env.goals.fetchGoal(goalId: goalId)
        let dto = try? await env.roadmap.fetchRoadmap(goalId: goalId)
        let tasks = (try? await env.roadmap.fetchTasks(goalId: goalId)) ?? []
        let weekState = try? await env.roadmap.fetchCurrentWeekState(goalId: goalId)

        if let title = goal?.title {
            goalTitle = title
        }
        milestones = Self.buildMilestones(from: dto, tasks: tasks, weekState: weekState)

        isLoading = false
        if !appeared {
            appeared = true
        }
    }

    private static func buildMilestones(
        from roadmap: RoadmapDTO?,
        tasks: [TaskDTO],
        weekState: CurrentWeekResponseDTO?
    ) -> [DisplayMilestone] {
        let records = (roadmap?.milestones ?? []).sorted { $0.orderIndex < $1.orderIndex }
        guard !records.isEmpty else { return [] }

        let progress: Double
        if tasks.isEmpty {
            progress = 0
        } else {
            let completed = tasks.filter { $0.completedAt != nil }.count
            progress = Double(completed) / Double(tasks.count)
        }

        let currentMilestoneId = roadmap?.currentMilestoneId
        let isInAdvance = weekState?.weekState == .inAdvance

        return records.map { record in
            let status = milestoneStatus(
                record: record,
                currentMilestoneId: currentMilestoneId,
                isInAdvance: isInAdvance
            )
            return DisplayMilestone(
                id: record.id,
                title: record.title,
                description: record.description,
                targetMonth: record.targetMonth,
                targetWeek: record.targetWeek,
                orderIndex: record.orderIndex,
                expectedOutcome: record.expectedOutcome,
                status: status,
                progress: status == .current ? progress : (status == .completed ? 1.0 : 0.0)
            )
        }
    }

    private static func milestoneStatus(
        record: MilestoneDTO,
        currentMilestoneId: String?,
        isInAdvance: Bool
    ) -> MilestoneStatus {
        if record.completedAt != nil {
            return .completed
        }
        if isInAdvance {
            return .upcoming
        }
        if let currentMilestoneId, record.id == currentMilestoneId {
            return .current
        }
        if currentMilestoneId == nil, record.orderIndex == 1 {
            return .current
        }
        return .upcoming
    }
}
