import SwiftData
import SwiftUI

struct DisplayMilestone: Identifiable {
    let id: String
    let title: String
    let description: String
    let targetMonth: Int
    let targetWeek: Int
    let isMonthlyCheckpoint: Bool
    let orderIndex: Int
    let expectedOutcome: String
    let status: MilestoneStatus
    let progress: Double
    var isKeyMilestone: Bool
}

struct RoadmapView: View {
    let goalId: String
    var onGoalChanged: ((String) -> Void)?

    @Environment(\.modelContext) private var modelContext
    @Query private var localGoals: [LocalGoal]
    @State private var milestones: [DisplayMilestone] = []
    @State private var isLoading = true
    @State private var appeared = false
    @State private var selectedMilestone: DisplayMilestone?

    private var currentGoal: LocalGoal? {
        localGoals.first { $0.id == goalId }
    }

    private var switchableGoals: [LocalGoal] {
        localGoals.filter { $0.status == "active" || $0.status == ProfileStatus.intakeCompleted.rawValue }
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                if isLoading && milestones.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView(showsIndicators: false) {
                        VStack(spacing: 0) {
                            headerSection

                            VStack(spacing: 0) {
                                ForEach(Array(milestones.enumerated()), id: \.element.id) { index, milestone in
                                    Button {
                                        selectedMilestone = milestone
                                    } label: {
                                        milestoneRow(milestone: milestone, index: index)
                                    }
                                    .buttonStyle(.plain)
                                    .opacity(appeared ? 1 : 0)
                                    .animation(
                                        .easeOut(duration: 0.35).delay(Double(index) * 0.06 + 0.1),
                                        value: appeared
                                    )
                                }
                            }
                            .padding(.horizontal, 20)
                        }
                        .padding(.bottom, 80)
                    }
                    .hapticRefreshable {
                        await loadMilestones()
                    }
                }
            }
            .navigationDestination(item: $selectedMilestone) { milestone in
                MilestoneDetailView(
                    title: milestone.title,
                    description: milestone.description,
                    expectedOutcome: milestone.expectedOutcome,
                    targetWeek: milestone.targetWeek,
                    isMonthlyCheckpoint: milestone.isMonthlyCheckpoint,
                    status: milestone.status
                )
            }
        }
        .task {
            guard milestones.isEmpty else { return }
            await loadMilestones()
        }
        .onAppear {
            appeared = true
        }
        .onChange(of: goalId) {
            milestones = []
            isLoading = true
            appeared = false
            Task {
                await loadMilestones()
                if !appeared {
                    appeared = true
                }
            }
        }
    }

    private var completionProgress: Double {
        guard !milestones.isEmpty else { return 0 }
        let completed = Double(milestones.filter { $0.status == .completed }.count)
        let currentProgress = milestones.contains(where: { $0.status == .current }) ? currentTaskProgress() : 0
        return (completed + currentProgress) / Double(milestones.count)
    }

    private var headerSection: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 8) {
                AppText("roadmap.journey.subtitle", table: "Roadmap", style: .caption)
                    .color(Color("TextSecondary"))

                if switchableGoals.count > 1 {
                    Menu {
                        ForEach(switchableGoals, id: \.id) { goal in
                            Button(goal.title) {
                                if goal.id != goalId {
                                    onGoalChanged?(goal.id)
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 8) {
                            AppText(verbatim: currentGoal?.title ?? "", style: .largeTitle)
                            TablerIcons(.chevronDown, size: 20, color: Color("TextSecondary"))
                        }
                    }
                } else {
                    AppText(verbatim: currentGoal?.title ?? "", style: .largeTitle)
                }
            }

            Spacer()

            ZStack {
                Circle()
                    .stroke(Color("TextSecondary").opacity(0.15), lineWidth: 4)
                Circle()
                    .trim(from: 0, to: completionProgress)
                    .stroke(Color("TintPrimary"), style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                AppText(
                    verbatim: "\(Int(completionProgress * 100))%",
                    style: .caption
                )
                .weight(.semibold)
                .color(Color("TintPrimary"))
            }
            .frame(width: 44, height: 44)
        }
        .padding(.horizontal, 24)
        .padding(.top, 32)
        .padding(.bottom, 20)
        .opacity(appeared ? 1 : 0)
        .animation(.easeOut(duration: 0.5), value: appeared)
    }

    private func milestoneRow(milestone: DisplayMilestone, index: Int) -> some View {
        let isFirst = index == 0
        let isLast = index == milestones.count - 1
        let verticalPad: CGFloat = 12

        return HStack(alignment: .top, spacing: 14) {
            VStack(spacing: 0) {
                if isFirst {
                    Spacer().frame(height: 14)
                } else {
                    Rectangle()
                        .fill(connectorColor(from: milestones[index - 1].status, to: milestone.status))
                        .frame(width: 2)
                        .frame(maxHeight: .infinity)
                }

                Spacer().frame(height: 4)
                timelineDot(milestone: milestone)
                Spacer().frame(height: 4)

                if isLast {
                    Spacer().frame(minHeight: 0)
                } else {
                    Rectangle()
                        .fill(connectorColor(from: milestone.status, to: milestones[index + 1].status))
                        .frame(width: 2)
                        .frame(maxHeight: .infinity)
                }
            }
            .frame(width: 32)

            VStack(alignment: .leading, spacing: 4) {
                AppText(
                    verbatim: milestone.title,
                    style: milestone.isKeyMilestone ? .headline : .body
                )
                .weight((milestone.isKeyMilestone || milestone.isMonthlyCheckpoint) ? .medium : .regular)
                .color(milestone.status == .upcoming ? Color("TextSecondary") : Color("TextPrimary"))

                HStack(spacing: 6) {
                    if milestone.isMonthlyCheckpoint {
                        AppText(
                            verbatim: String(
                                format: String(localized: "roadmap.milestone.month", table: "Roadmap"),
                                milestone.targetMonth
                            ),
                            style: .caption
                        )
                        .color(Color("TextSecondary").opacity(0.5))
                    } else {
                        AppText(
                            verbatim: String(
                                format: String(localized: "roadmap.milestone.week", table: "Roadmap"),
                                milestone.targetWeek
                            ),
                            style: .caption
                        )
                        .color(Color("TextSecondary").opacity(0.5))
                    }

                    if milestone.status == .current {
                        AppText(verbatim: "·", style: .caption)
                            .color(Color("TextSecondary"))
                        AppText(verbatim: "\(Int(milestone.progress * 100))%", style: .caption)
                            .weight(.semibold)
                            .color(Color("TintPrimary"))
                    }
                }
            }
            .padding(.vertical, verticalPad)
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack {
                Spacer()
                TablerIcons(.chevronRight, size: 16, color: Color("TextSecondary").opacity(0.3))
                Spacer()
            }
        }
    }

    private func timelineDot(milestone: DisplayMilestone) -> some View {
        let isCurrent = milestone.status == .current
        let isSpecial = milestone.isKeyMilestone || milestone.isMonthlyCheckpoint
        let size: CGFloat = (isCurrent || isSpecial) ? 28 : 16

        return ZStack {
            switch milestone.status {
            case .completed:
                Circle()
                    .fill(Color("StatusSuccess"))
                    .frame(width: size, height: size)
            case .current:
                Circle()
                    .fill(Color("TintPrimary"))
                    .frame(width: size, height: size)
            case .upcoming:
                Circle()
                    .fill(Color("BgSurface"))
                    .frame(width: size, height: size)
            }

            dotIcon(milestone)
        }
    }

    private func dotIcon(_ milestone: DisplayMilestone) -> some View {
        let accentColor = Color("TextOnAccent")
        let mutedColor = Color("TextSecondary")

        return Group {
            if milestone.isKeyMilestone {
                TablerIcons(.trophy, size: 14, color: milestone.status == .upcoming ? mutedColor : accentColor)
            } else if milestone.isMonthlyCheckpoint {
                TablerIcons(.targetArrow, size: 14, color: milestone.status == .upcoming ? mutedColor : accentColor)
            } else {
                switch milestone.status {
                case .completed:
                    TablerIcons(.check, size: 10, color: accentColor)
                case .current:
                    TablerIcons(.mapPin, size: 14, color: accentColor)
                case .upcoming:
                    EmptyView()
                }
            }
        }
    }

    private func currentTaskProgress() -> Double {
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        guard let tasks = try? modelContext.fetch(descriptor), !tasks.isEmpty else { return 0 }
        let completed = tasks.filter(\.isCompleted).count
        return Double(completed) / Double(tasks.count)
    }

    private func connectorColor(from: MilestoneStatus, to: MilestoneStatus) -> Color {
        switch (from, to) {
        case (.completed, .completed):
            Color("StatusSuccess").opacity(0.4)
        case (.completed, .current), (.current, .completed):
            Color("StatusSuccess").opacity(0.25)
        default:
            Color("TextSecondary").opacity(0.15)
        }
    }

    private func loadMilestones() async {
        let cached = fetchCachedMilestones()
        if !cached.isEmpty {
            milestones = cached
            isLoading = false
            if !appeared {
                appeared = true
            }
        }

        do {
            let roadmap = try await RoadmapAPIService.shared.getRoadmap(goalId: goalId)
            guard let dtos = roadmap.milestones else { return }

            syncRoadmapToCache(roadmap)

            let sorted = dtos.sorted { $0.orderIndex < $1.orderIndex }
            let currentMilestoneId = roadmap.currentMilestoneId
            var foundCurrent = false

            milestones = sorted.enumerated().map { index, dto in
                let status: MilestoneStatus
                if let currentId = currentMilestoneId {
                    if dto.id == currentId {
                        status = .current
                        foundCurrent = true
                    } else if !foundCurrent {
                        status = .completed
                    } else {
                        status = .upcoming
                    }
                } else {
                    status = index == 0 ? .current : .upcoming
                }

                return DisplayMilestone(
                    id: dto.id,
                    title: dto.title,
                    description: dto.description,
                    targetMonth: dto.targetMonth,
                    targetWeek: dto.targetWeek,
                    isMonthlyCheckpoint: dto.isMonthlyCheckpoint,
                    orderIndex: dto.orderIndex,
                    expectedOutcome: dto.expectedOutcome,
                    status: status,
                    progress: status == .current ? currentTaskProgress() : (status == .completed ? 1.0 : 0.0),
                    isKeyMilestone: index == sorted.count - 1
                )
            }
        } catch {}
        isLoading = false
    }

    private func fetchCachedMilestones() -> [DisplayMilestone] {
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalRoadmap>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        guard let localRoadmap = try? modelContext.fetch(descriptor).first,
              !localRoadmap.milestones.isEmpty else { return [] }

        let sorted = localRoadmap.milestones.sorted { $0.orderIndex < $1.orderIndex }
        let currentMilestoneId = localRoadmap.currentMilestoneId
        var foundCurrent = false

        return sorted.enumerated().map { index, local in
            let status: MilestoneStatus
            if let currentId = currentMilestoneId {
                if local.id == currentId {
                    status = .current
                    foundCurrent = true
                } else if !foundCurrent {
                    status = .completed
                } else {
                    status = .upcoming
                }
            } else {
                status = index == 0 ? .current : .upcoming
            }

            return DisplayMilestone(
                id: local.id,
                title: local.title,
                description: local.milestoneDescription,
                targetMonth: local.targetMonth,
                targetWeek: local.targetWeek,
                isMonthlyCheckpoint: local.isMonthlyCheckpoint,
                orderIndex: local.orderIndex,
                expectedOutcome: local.expectedOutcome,
                status: status,
                progress: status == .current ? currentTaskProgress() : (status == .completed ? 1.0 : 0.0),
                isKeyMilestone: index == sorted.count - 1
            )
        }
    }

    private func syncRoadmapToCache(_ dto: RoadmapDTO) {
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalRoadmap>(
            predicate: #Predicate { $0.goalId == goalId }
        )

        if let existing = try? modelContext.fetch(descriptor).first {
            existing.status = dto.status.rawValue
            existing.updatedAt = dto.updatedAt
            existing.currentMilestoneId = dto.currentMilestoneId

            if let dtos = dto.milestones {
                let existingById = Dictionary(uniqueKeysWithValues: existing.milestones.map { ($0.id, $0) })
                let remoteIds = Set(dtos.map(\.id))

                for milestoneDTO in dtos {
                    if let local = existingById[milestoneDTO.id] {
                        local.title = milestoneDTO.title
                        local.milestoneDescription = milestoneDTO.description
                        local.expectedOutcome = milestoneDTO.expectedOutcome
                        local.targetMonth = milestoneDTO.targetMonth
                        local.targetWeek = milestoneDTO.targetWeek
                        local.isMonthlyCheckpoint = milestoneDTO.isMonthlyCheckpoint
                        local.orderIndex = milestoneDTO.orderIndex
                    } else {
                        let local = LocalMilestone(
                            id: milestoneDTO.id,
                            roadmapId: milestoneDTO.roadmapId,
                            goalId: milestoneDTO.goalId,
                            orderIndex: milestoneDTO.orderIndex,
                            title: milestoneDTO.title,
                            milestoneDescription: milestoneDTO.description,
                            expectedOutcome: milestoneDTO.expectedOutcome,
                            targetMonth: milestoneDTO.targetMonth,
                            targetWeek: milestoneDTO.targetWeek,
                            isMonthlyCheckpoint: milestoneDTO.isMonthlyCheckpoint,
                            createdAt: milestoneDTO.createdAt
                        )
                        local.roadmap = existing
                        existing.milestones.append(local)
                    }
                }

                for local in existing.milestones where !remoteIds.contains(local.id) {
                    modelContext.delete(local)
                }
            }
        } else {
            let localMilestones = (dto.milestones ?? []).map { milestoneDTO in
                LocalMilestone(
                    id: milestoneDTO.id,
                    roadmapId: milestoneDTO.roadmapId,
                    goalId: milestoneDTO.goalId,
                    orderIndex: milestoneDTO.orderIndex,
                    title: milestoneDTO.title,
                    milestoneDescription: milestoneDTO.description,
                    expectedOutcome: milestoneDTO.expectedOutcome,
                    targetMonth: milestoneDTO.targetMonth,
                    targetWeek: milestoneDTO.targetWeek,
                    isMonthlyCheckpoint: milestoneDTO.isMonthlyCheckpoint,
                    createdAt: milestoneDTO.createdAt
                )
            }

            let local = LocalRoadmap(
                id: dto.id,
                goalId: dto.goalId,
                userId: dto.userId,
                status: dto.status.rawValue,
                createdAt: dto.createdAt,
                updatedAt: dto.updatedAt,
                currentMilestoneId: dto.currentMilestoneId,
                milestones: localMilestones
            )
            modelContext.insert(local)
        }
    }
}

extension DisplayMilestone: Hashable {
    static func == (lhs: DisplayMilestone, rhs: DisplayMilestone) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

#Preview {
    RoadmapView(goalId: "preview-goal")
        .modelContainer(for: [LocalGoal.self], inMemory: true)
}
