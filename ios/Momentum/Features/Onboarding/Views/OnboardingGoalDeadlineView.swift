import SwiftUI

struct OnboardingGoalDeadlineView: View {
    @Binding var deadline: Date
    let onContinue: () -> Void

    private var dateRange: ClosedRange<Date> {
        let calendar = Calendar.current
        let now = Date()
        let minDate = calendar.date(byAdding: .day, value: 1, to: now)!
        let maxDate = calendar.date(byAdding: .year, value: 5, to: now)!
        return minDate...maxDate
    }

    var body: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            VStack(spacing: AppTheme.Spacing.xs) {
                AppText("onboarding.deadline.title", table: "Onboarding", style: .title)
                    .alignment(.center)

                AppText("onboarding.deadline.subtitle", table: "Onboarding", style: .subheadline)
            }
            .padding(.top, AppTheme.Spacing.xxl)
            .padding(.bottom, AppTheme.Spacing.md)
            .padding(.horizontal, AppTheme.Spacing.lg)

            DatePicker(
                "",
                selection: $deadline,
                in: dateRange,
                displayedComponents: .date
            )
            .datePickerStyle(.wheel)
            .labelsHidden()

            Spacer()

            VStack(spacing: AppTheme.Spacing.md) {
                AppButton("common.continue", table: "Common", action: onContinue)
                    .fullWidth()

                AppText("onboarding.editLater", table: "Onboarding", style: .caption)
                    .alignment(.center)
            }
            .padding(.bottom, AppTheme.Spacing.lg)
        }
    }
}

#Preview {
    NavigationStack {
        OnboardingGoalDeadlineView(
            deadline: .constant(Calendar.current.date(byAdding: .month, value: 1, to: Date())!),
            onContinue: { }
        )
    }
}
