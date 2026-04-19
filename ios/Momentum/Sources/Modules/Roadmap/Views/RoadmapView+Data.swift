import SwiftData
import SwiftUI

extension RoadmapView {
    func currentTaskProgress() -> Double {
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        guard let tasks = try? modelContext.fetch(descriptor), !tasks.isEmpty else { return 0 }
        let completed = tasks.filter(\.isCompleted).count
        return Double(completed) / Double(tasks.count)
    }

    func loadMilestones() async {
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

    func fetchCachedMilestones() -> [DisplayMilestone] {
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

    func syncRoadmapToCache(_ dto: RoadmapDTO) {
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
